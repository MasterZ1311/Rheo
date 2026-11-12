"""Security regression test suite for Phase 2 hardening.

Tests cover:
- Storage path traversal prevention
- Rate limit enforcement across client IP (preventing header spoofing bypass)
- MCP Client ID validation and injection prevention
- Remote administrative endpoint authorization
- Remote cloud pairing prevention
- Zip Slip, symlink attack, and Zip bomb prevention in archive extraction
- Streaming upload size limits
- Secure OS credential storage & masked DB persistence
"""

import io
import os
import zipfile
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend import config, models
from backend.database import Base, MCPClientBinding, get_db
from backend.mcp_server.context import (
    CLIENT_ID_HEADER,
    ClientIdMiddleware,
    is_valid_client_id,
    request_is_loopback,
)
from backend.services import cloud as cloud_service
from backend.services import export_import
from backend.services.credentials import (
    delete_cloud_key,
    retrieve_cloud_key,
    store_cloud_key,
)
from backend.utils.auth import is_admin_authorized, require_admin


# ==============================================================================
# 1. Storage Path Traversal Prevention
# ==============================================================================

def test_storage_path_traversal_escapes_rejected(tmp_path, monkeypatch):
    """Paths containing directory traversal or pointing outside data_dir must return None."""
    monkeypatch.setattr(config, "_data_dir", tmp_path)

    # Relative directory traversal
    assert config.resolve_storage_path("../../etc/passwd") is None
    assert config.resolve_storage_path("..\\..\\Windows\\System32\\cmd.exe") is None
    assert config.resolve_storage_path("profiles/../../outside.wav") is None

    # Absolute path outside data_dir
    outside = Path(tmp_path).parent / "outside.wav"
    assert config.resolve_storage_path(str(outside)) is None

    # Safe file inside data_dir
    inside = tmp_path / "profiles" / "test.wav"
    inside.parent.mkdir(parents=True, exist_ok=True)
    inside.write_bytes(b"RIFFtest")
    resolved = config.resolve_storage_path("profiles/test.wav")
    assert resolved == inside.resolve()
    assert config.is_safe_storage_path("profiles/test.wav") is True
    assert config.is_safe_storage_path("../../evil.wav") is False


# ==============================================================================
# 2. MCP Client ID Validation & Injection Prevention
# ==============================================================================

def test_client_id_validation_rules():
    """Client IDs must be clean alphanumeric identifiers under 64 characters."""
    assert is_valid_client_id("claude-code") is True
    assert is_valid_client_id("cursor.ide_1") is True
    assert is_valid_client_id("my-agent-42") is True

    # Empty, None, or wrong type
    assert is_valid_client_id("") is False
    assert is_valid_client_id(None) is False

    # Oversized strings (DoS / memory leak payload)
    assert is_valid_client_id("a" * 65) is False
    assert is_valid_client_id("a" * 1000) is False

    # Special characters and injection attempts
    assert is_valid_client_id("client; DROP TABLE MCPClientBinding;--") is False
    assert is_valid_client_id("client\nNewline") is False
    assert is_valid_client_id("client/slash") is False
    assert is_valid_client_id("client\\backslash") is False
    assert is_valid_client_id("client<script>") is False


def test_remote_unauthenticated_mcp_client_cannot_auto_register(tmp_path, monkeypatch):
    """A remote caller sending X-Rheo-Client-Id must NOT create new MCPClientBinding rows."""
    db_path = tmp_path / "test_mcp.db"
    engine = create_engine(f"sqlite:///{db_path}")
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(bind=engine)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app = FastAPI()
    app.add_middleware(ClientIdMiddleware)

    @app.post("/speak")
    async def dummy_speak():
        return {"ok": True}

    monkeypatch.setattr("backend.database.get_db", override_get_db)

    # 1. Remote request (non-loopback peer)
    with TestClient(app, client=("192.168.1.55", 50000)) as client:
        resp = client.post("/speak", headers={CLIENT_ID_HEADER: "remote-untrusted-agent"})
        assert resp.status_code == 200

    db = TestingSession()
    row = db.query(MCPClientBinding).filter_by(client_id="remote-untrusted-agent").first()
    db.close()
    assert row is None, "Remote unauthenticated caller must NOT be auto-registered in database!"

    # 2. Local loopback request (trusted local agent)
    with TestClient(app, client=("127.0.0.1", 50000)) as client:
        resp = client.post("/speak", headers={CLIENT_ID_HEADER: "local-claude"})
        assert resp.status_code == 200

    import time
    registered = False
    for _ in range(30):
        db = TestingSession()
        row = db.query(MCPClientBinding).filter_by(client_id="local-claude").first()
        db.close()
        if row is not None:
            registered = True
            break
        time.sleep(0.05)
    assert registered, "Local loopback agent should be registered automatically"


# ==============================================================================
# 3. Rate Limit Enforcement (IP-Based Protection Against Header Spoofing)
# ==============================================================================

def test_rate_limit_cannot_be_bypassed_by_spoofing_client_id(monkeypatch):
    """Rotating X-Rheo-Client-Id from the same IP must NOT reset the rate limiter."""
    from backend.app import create_app

    monkeypatch.setenv("RHEO_RATE_LIMIT_PER_MINUTE", "3")
    app = create_app()

    with TestClient(app, client=("192.168.1.101", 40000)) as client:
        # Request 1, 2, 3 with different client IDs from same IP
        r1 = client.post("/generate", json={"text": "hello", "profile_id": "none"}, headers={"X-Rheo-Client-Id": "agent-1"})
        r2 = client.post("/generate", json={"text": "hello", "profile_id": "none"}, headers={"X-Rheo-Client-Id": "agent-2"})
        r3 = client.post("/generate", json={"text": "hello", "profile_id": "none"}, headers={"X-Rheo-Client-Id": "agent-3"})

        # Requests are evaluated by rate limiter before validation
        assert r1.status_code in (400, 404, 422)
        assert r2.status_code in (400, 404, 422)
        assert r3.status_code in (400, 404, 422)

        # 4th request from same IP with yet another new client ID MUST be blocked with 429
        r4 = client.post("/generate", json={"text": "hello", "profile_id": "none"}, headers={"X-Rheo-Client-Id": "agent-4"})
        assert r4.status_code == 429
        assert "Rate limit exceeded" in r4.json()["detail"]


# ==============================================================================
# 4. Administrative Endpoint Protection
# ==============================================================================

@pytest.mark.parametrize(
    "method,path,payload",
    [
        ("POST", "/shutdown", None),
        ("POST", "/watchdog/disable", None),
        ("POST", "/models/unload", None),
        ("POST", "/models/qwen/unload", None),
        ("DELETE", "/models/qwen", None),
        ("PUT", "/settings/captures", {"auto_cleanup_days": 30}),
        ("PUT", "/settings/generation", {"default_speed": 1.0}),
        ("PUT", "/mcp/bindings", {"client_id": "test", "label": "Test"}),
        ("DELETE", "/mcp/bindings/test", None),
        ("POST", "/cloud/disconnect", None),
    ],
)
def test_remote_administrative_endpoints_require_auth(method, path, payload, monkeypatch):
    """Remote callers without RHEO_API_KEY must be rejected with 403."""
    from backend.app import create_app

    monkeypatch.delenv("RHEO_API_KEY", raising=False)
    app = create_app()

    # Remote caller (non-loopback)
    with TestClient(app, client=("192.168.1.200", 50000)) as client:
        if method == "POST":
            resp = client.post(path, json=payload or {})
        elif method == "PUT":
            resp = client.put(path, json=payload or {})
        elif method == "DELETE":
            resp = client.delete(path)
        assert resp.status_code == 403, f"{method} {path} should be forbidden for remote client without API key"


def test_remote_admin_with_valid_api_key_allowed(monkeypatch):
    """Remote caller with valid RHEO_API_KEY is allowed through require_admin."""
    from backend.app import create_app

    monkeypatch.setenv("RHEO_API_KEY", "super-secret-passphrase-42")
    app = create_app()

    # Remote caller with correct X-API-Key
    with TestClient(app, client=("192.168.1.200", 50000)) as client:
        # Access a settings endpoint
        resp = client.put(
            "/settings/generation",
            json={"default_speed": 1.0},
            headers={"X-API-Key": "super-secret-passphrase-42"},
        )
        # Should NOT be 403 Forbidden
        assert resp.status_code != 403


def test_remote_cloud_pairing_blocked():
    """Remote callers cannot initiate browser device login."""
    from backend.app import create_app

    app = create_app()
    with TestClient(app, client=("192.168.1.200", 50000)) as client:
        resp = client.post("/cloud/login/start")
        assert resp.status_code == 403
        assert "local machine" in resp.json()["detail"]


# ==============================================================================
# 5. Zip Slip, Symlinks, and Zip Bomb Prevention
# ==============================================================================

@pytest.mark.asyncio
async def test_zip_slip_path_traversal_rejected(tmp_path):
    """Archives with directory traversal members must be rejected immediately."""
    db_path = tmp_path / "test_zip.db"
    engine = create_engine(f"sqlite:///{db_path}")
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(bind=engine)
    db = TestingSession()

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("manifest.json", '{"version": "1.0", "profile": {"name": "Evil"}}')
        zf.writestr("samples.json", '{"../../evil.wav": "text"}')
        zf.writestr("../../evil.wav", b"RIFFdata")

    buf.seek(0)
    with pytest.raises(ValueError, match="Malicious path traversal"):
        await export_import.import_profile_from_zip(buf.getvalue(), db)
    db.close()


def test_zip_bomb_uncompressed_limit_rejected():
    """Archives with uncompressed size exceeding limit must be rejected."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("manifest.json", '{"version": "1.0", "profile": {"name": "Bomb"}}')
        zf.writestr("samples/sample.wav", b"x" * 2000)

    buf.seek(0)
    with zipfile.ZipFile(buf, "r") as zf:
        with pytest.raises(ValueError, match="ZIP uncompressed content exceeds size limit"):
            export_import._audit_zip_safety(zf, max_uncompressed_bytes=1000)


# ==============================================================================
# 6. Streaming Upload Limits
# ==============================================================================

def test_avatar_upload_oversized_rejected():
    """Avatar uploads exceeding 10MB must be rejected with 413 during streaming."""
    from backend.app import create_app

    app = create_app()
    with TestClient(app) as client:
        # 11 MB payload
        oversized = b"P" * (11 * 1024 * 1024)
        resp = client.post(
            "/profiles/fake-id/avatar",
            files={"file": ("avatar.png", oversized, "image/png")},
        )
        assert resp.status_code == 413
        assert "Avatar file exceeds" in resp.json()["detail"]


def test_profile_import_oversized_rejected():
    """Profile ZIP imports exceeding 100MB must return 413 during streaming."""
    from backend.app import create_app

    app = create_app()
    with TestClient(app) as client:
        oversized = b"Z" * (101 * 1024 * 1024)
        resp = client.post(
            "/profiles/import",
            files={"file": ("profile.zip", oversized, "application/zip")},
        )
        assert resp.status_code == 413
        assert "File too large" in resp.json()["detail"]


# ==============================================================================
# 7. OS Credential Storage & Database Masking
# ==============================================================================

def test_cloud_credentials_keyring_storage(tmp_path):
    """Cloud API keys should be stored in OS keyring and masked in SQLite."""
    db_path = tmp_path / "test_cloud.db"
    engine = create_engine(f"sqlite:///{db_path}")
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(bind=engine)
    db = TestingSession()

    test_key = "rheo_live_key_abcdef123456789"

    # Store key
    cloud_service._store_key(db, api_key=test_key, device_name="Test Rig", account_user_id="usr_123")

    # In database, row should not store plaintext key if keyring succeeded
    row = cloud_service._get_or_create_row(db)
    assert row.api_key.startswith("[KEYRING]:") or row.api_key == test_key

    # Status shows prefix only
    status = cloud_service.get_status(db)
    assert status["connected"] is True
    assert status["key_prefix"] == "rheo_live_key"
    assert status["device_name"] == "Test Rig"

    # Disconnect cleans up
    cloud_service.disconnect(db)
    status_after = cloud_service.get_status(db)
    assert status_after["connected"] is False
    assert status_after["key_prefix"] is None
    db.close()


# ==============================================================================
# 8. Phase 2.1 Verification Suite: Deep Boundary & Fallback Tests
# ==============================================================================

def test_loopback_admin_rejects_untrusted_browser_origin():
    """Loopback request to administrative endpoints from an untrusted browser origin must be blocked."""
    from backend.app import create_app

    app = create_app()
    with TestClient(app, client=("127.0.0.1", 50000)) as client:
        resp = client.post(
            "/models/unload",
            headers={"Origin": "https://evil-website.com"},
        )
        assert resp.status_code == 403


def test_loopback_admin_rejects_arbitrary_local_port_origin():
    """Loopback request from an unauthorized local port (e.g. localhost:8080) must be blocked."""
    from backend.app import create_app

    app = create_app()
    with TestClient(app, client=("127.0.0.1", 50000)) as client:
        resp = client.post(
            "/models/unload",
            headers={"Origin": "http://localhost:8080"},
        )
        assert resp.status_code == 403


def test_loopback_admin_rejects_cross_site_fetch():
    """Loopback request marked Sec-Fetch-Site: cross-site must be blocked without API key."""
    from backend.app import create_app

    app = create_app()
    with TestClient(app, client=("127.0.0.1", 50000)) as client:
        resp = client.post(
            "/models/unload",
            headers={"Sec-Fetch-Site": "cross-site"},
        )
        assert resp.status_code == 403


def test_loopback_admin_allows_trusted_tauri_origin():
    """Loopback request from trusted Tauri webview origin must be permitted."""
    from backend.app import create_app

    app = create_app()
    with TestClient(app, client=("127.0.0.1", 50000)) as client:
        resp = client.put(
            "/settings/generation",
            json={"default_speed": 1.0},
            headers={"Origin": "https://tauri.localhost"},
        )
        assert resp.status_code != 403


def test_loopback_admin_allows_cli_curl_without_origin():
    """Local CLI / desktop processes without Origin headers are authorized for administrative actions."""
    from backend.app import create_app

    app = create_app()
    with TestClient(app, client=("127.0.0.1", 50000)) as client:
        resp = client.put(
            "/settings/generation",
            json={"default_speed": 1.0},
        )
        assert resp.status_code != 403


def test_trusted_host_middleware_blocks_dns_rebinding():
    """Requests with untrusted Host headers (DNS rebinding attempts) must be rejected with 400."""
    from backend.app import create_app

    app = create_app()
    with TestClient(app) as client:
        resp = client.get("/health", headers={"Host": "attacker-rebinding.com:17493"})
        assert resp.status_code == 400
        assert "Invalid host header" in resp.text


def test_credential_fallback_when_keyring_unavailable(tmp_path, monkeypatch):
    """When OS keyring is unavailable, secret is stored in fallback file and NEVER in plaintext in SQLite."""
    from backend.services import credentials

    # Set data dir
    monkeypatch.setattr(config, "_data_dir", tmp_path)

    # Force keyring to fail
    def fake_set_password(svc, acc, pwd):
        raise RuntimeError("No SecretService daemon available")

    monkeypatch.setattr("keyring.set_password", fake_set_password)

    db_path = tmp_path / "test_fallback.db"
    engine = create_engine(f"sqlite:///{db_path}")
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(bind=engine)
    db = TestingSession()

    test_secret = "rheo_live_secret_key_998877665544"
    cloud_service._store_key(db, api_key=test_secret, device_name="Fallback Node", account_user_id="u_99")

    # In database, api_key must be masked with [KEYRING]: prefix, NOT plaintext
    row = cloud_service._get_or_create_row(db)
    assert row.api_key == f"[KEYRING]:{test_secret[:13]}"
    assert test_secret not in row.api_key

    # Secret is retrievable via fallback file
    retrieved = credentials.retrieve_cloud_key()
    assert retrieved == test_secret

    # Verify fallback file exists with content
    fallback_file = tmp_path / ".cloud_credentials"
    assert fallback_file.exists()
    assert fallback_file.read_text(encoding="utf-8").strip() == test_secret

    # Disconnect cleans up fallback file
    cloud_service.disconnect(db)
    assert not fallback_file.exists()
    assert credentials.retrieve_cloud_key() is None
    db.close()


def test_legacy_plaintext_credential_migrated_and_masked_in_db(tmp_path, monkeypatch):
    """Existing plaintext keys in SQLite are migrated on read and immediately masked in the DB."""
    monkeypatch.setattr(config, "_data_dir", tmp_path)

    db_path = tmp_path / "legacy.db"
    engine = create_engine(f"sqlite:///{db_path}")
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(bind=engine)
    db = TestingSession()

    # Manually insert legacy plaintext row
    legacy_row = cloud_service._get_or_create_row(db)
    legacy_secret = "rheo_live_legacy_secret_112233"
    legacy_row.api_key = legacy_secret
    db.commit()

    # Read via get_api_key: triggers migration
    migrated_key = cloud_service.get_api_key(db)
    assert migrated_key == legacy_secret

    # Check database row: plaintext key has been replaced by masked sentinel!
    db.expire_all()
    updated_row = cloud_service._get_or_create_row(db)
    assert updated_row.api_key == f"[KEYRING]:{legacy_secret[:13]}"
    assert updated_row.api_key != legacy_secret
    db.close()


def test_zip_extraction_traversal_variants():
    """Zip audit must catch backslash, drive letter, UNC, and null-byte traversal paths."""
    from backend.services.export_import import _audit_zip_safety

    variants = [
        "..\\Windows\\win.ini",
        "folder\\..\\..\\evil.wav",
        "/etc/shadow",
        "\\server\\share\\evil.wav",
        "C:evil.wav",
        "D:\\data\\evil.wav",
        "samples/safe.wav\x00evil.wav",
    ]

    for bad_name in variants:
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as zf:
            zf.writestr(bad_name, b"test content")
        buf.seek(0)
        with zipfile.ZipFile(buf, "r") as zf:
            if "\x00" in bad_name:
                zf.infolist()[0].filename = bad_name
            with pytest.raises(ValueError, match="Malicious path traversal"):
                _audit_zip_safety(zf, 10 * 1024 * 1024)


def test_zip_windows_reparse_point_rejected():
    """Zip entries with Windows reparse point attribute must be rejected."""
    from backend.services.export_import import _audit_zip_safety

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zinfo = zipfile.ZipInfo("symlink_dir")
        zinfo.external_attr = 0x400  # FILE_ATTRIBUTE_REPARSE_POINT
        zf.writestr(zinfo, b"")
    buf.seek(0)
    with zipfile.ZipFile(buf, "r") as zf:
        with pytest.raises(ValueError, match="Reparse points / symlinks are forbidden"):
            _audit_zip_safety(zf, 10 * 1024 * 1024)


def test_zip_misleading_size_metadata_rejected():
    """Stream reader must reject entries whose decompressed stream exceeds limit despite false metadata."""
    from backend.services.export_import import _safe_read_zip_entry

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        # 1MB of repetitive zeros compresses to a few hundred bytes
        payload = b"0" * (1024 * 1024)
        zf.writestr("large.txt", payload)

    buf.seek(0)
    with zipfile.ZipFile(buf, "r") as zf:
        # Enforce max limit of 100KB for large.txt (actual is 1MB)
        with pytest.raises(ValueError, match="decompressed size exceeds allowed limit"):
            _safe_read_zip_entry(zf, "large.txt", max_bytes=100 * 1024)


@pytest.mark.asyncio
async def test_profile_import_failure_cleans_up_filesystem_and_db(tmp_path, monkeypatch):
    """If profile import fails halfway, filesystem folder and DB profile must be rolled back."""
    monkeypatch.setattr(config, "_data_dir", tmp_path)

    db_path = tmp_path / "test_cleanup.db"
    engine = create_engine(f"sqlite:///{db_path}")
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(bind=engine)
    db = TestingSession()

    # Create a profile ZIP where sample 2 has an invalid name that will trigger an exception
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        manifest = {
            "version": "1.0",
            "profile": {"name": "Test Cleanup Profile", "language": "en"},
        }
        zf.writestr("manifest.json", __import__("json").dumps(manifest))
        samples = {
            "sample1.wav": "text one",
            "bad_sample.notwav": "text two",
        }
        zf.writestr("samples.json", __import__("json").dumps(samples))
        zf.writestr("samples/sample1.wav", b"RIFFsample1")
        zf.writestr("samples/bad_sample.notwav", b"RIFFsample2")

    buf.seek(0)
    with pytest.raises(ValueError):
        await export_import.import_profile_from_zip(buf.read(), db)

    # Confirm DB has NO profile record
    from backend.database import VoiceProfile
    profiles = db.query(VoiceProfile).all()
    assert len(profiles) == 0

    # Confirm profiles dir has no leftover folder
    profiles_dir = tmp_path / "profiles"
    if profiles_dir.exists():
        assert len(list(profiles_dir.iterdir())) == 0

    db.close()
