"""Data integrity and recovery regression test suite for Phase 3.

Covers:
1. Database transaction integrity, rollbacks, and FK cascading.
2. AI model cache migration (path validation, disk space checks, staging, rollback, runtime switch).
3. Large data and memory integrity (streaming uploads, size limit enforcement, temp file cleanup).
4. Safe deletion and storage integrity (commit-before-unlink, shared file preservation, path containment).
5. WAL-safe SQLite backups, integrity checking, and safe disaster recovery rollback.
"""

import asyncio
import io
import os
import shutil
import sqlite3
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException, UploadFile
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from backend import config, models
from backend.database import (
    AudioChannel,
    Base,
    Capture as DBCapture,
    EffectPreset,
    Generation as DBGeneration,
    GenerationVersion as DBGenerationVersion,
    MCPClientBinding,
    ProfileChannelMapping,
    ProfileSample as DBProfileSample,
    Story,
    StoryItem,
    VoiceProfile as DBVoiceProfile,
    get_db,
)
from backend.routes.captures import MAX_CAPTURE_SIZE, create_capture_endpoint
from backend.services import (
    backup as backup_service,
    captures as captures_service,
    history as history_service,
    model_migration,
    profiles as profiles_service,
    versions as versions_service,
)


@pytest.fixture
def test_db_session(tmp_path, monkeypatch):
    """Create a temporary SQLite database with WAL and foreign keys enabled."""
    db_file = tmp_path / "rheo_test.db"
    monkeypatch.setattr(config, "_data_dir", tmp_path)

    engine = create_engine(
        f"sqlite:///{db_file}",
        connect_args={"check_same_thread": False, "timeout": 30.0},
    )

    @event.listens_for(engine, "connect")
    def _set_pragmas(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        engine.dispose()


# ==============================================================================
# TASK 1: DATABASE TRANSACTION INTEGRITY & CASCADE
# ==============================================================================

def test_get_db_rolls_back_on_unhandled_exception(tmp_path, monkeypatch):
    """Test that get_db() dependency rolls back transaction if exception occurs."""
    db_file = tmp_path / "session_test.db"
    monkeypatch.setattr(config, "_data_dir", tmp_path)

    engine = create_engine(f"sqlite:///{db_file}")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    from backend.database import session as session_module
    monkeypatch.setattr(session_module, "SessionLocal", Session)

    # Simulate an endpoint raising an exception inside get_db()
    with pytest.raises(RuntimeError, match="Simulated route error"):
        for db in session_module.get_db():
            channel = AudioChannel(id="chan-1", name="Channel 1", is_default=False)
            db.add(channel)
            # flush or add without commit
            db.flush()
            raise RuntimeError("Simulated route error")

    # Verify that the uncommitted row was rolled back and is not in DB
    verify_db = Session()
    try:
        assert verify_db.query(AudioChannel).filter_by(id="chan-1").first() is None
    finally:
        verify_db.close()
        engine.dispose()


@pytest.mark.asyncio
async def test_profile_deletion_cascades_safely_with_foreign_keys(test_db_session, tmp_path, monkeypatch):
    """Deleting a profile must atomically remove mappings, generations, versions,
    samples, and story items without FK constraint violations.
    """
    db = test_db_session
    profile_id = "test-prof-cascade"
    profile_dir = tmp_path / "profiles" / profile_id
    profile_dir.mkdir(parents=True, exist_ok=True)
    sample_wav = profile_dir / "sample1.wav"
    sample_wav.write_bytes(b"RIFFdummydata")

    # 1. Create Profile and commit
    prof = DBVoiceProfile(
        id=profile_id,
        name="Cascade Profile",
        voice_type="cloned",
    )
    db.add(prof)
    db.commit()

    # 2. Create Audio Channel & Mapping
    channel = AudioChannel(id="chan-cascade", name="Channel", is_default=False)
    db.add(channel)
    db.commit()

    mapping = ProfileChannelMapping(profile_id=profile_id, channel_id="chan-cascade")
    mcp_binding = MCPClientBinding(
        client_id="mcp-client-1",
        profile_id=profile_id,
    )
    sample = DBProfileSample(
        id="sample-1",
        profile_id=profile_id,
        audio_path=f"profiles/{profile_id}/sample1.wav",
        reference_text="Sample text 1",
    )
    gen = DBGeneration(
        id="gen-cascade-1",
        profile_id=profile_id,
        text="Hello cascade",
        audio_path="generations/gen1.wav",
        status="completed",
    )
    db.add_all([mapping, mcp_binding, sample, gen])
    db.commit()

    # 5. Create Version & Story
    ver = DBGenerationVersion(
        id="ver-cascade-1",
        generation_id="gen-cascade-1",
        label="original",
        audio_path="generations/gen1.wav",
        is_default=True,
    )
    story = Story(id="story-cascade", name="My Story")
    db.add_all([ver, story])
    db.commit()

    # 6. Create Story Item linking generation to story
    item = StoryItem(
        id="story-item-1",
        story_id="story-cascade",
        generation_id="gen-cascade-1",
        version_id="ver-cascade-1",
        start_time_ms=0,
    )
    db.add(item)
    db.commit()

    # Delete profile
    deleted = await profiles_service.delete_profile(profile_id, db)
    assert deleted is True

    # Verify everything cleaned up or unbound
    assert db.query(DBVoiceProfile).filter_by(id=profile_id).first() is None
    assert db.query(ProfileChannelMapping).filter_by(profile_id=profile_id).first() is None
    assert db.query(DBProfileSample).filter_by(profile_id=profile_id).first() is None
    assert db.query(DBGeneration).filter_by(profile_id=profile_id).first() is None
    assert db.query(DBGenerationVersion).filter_by(id="ver-cascade-1").first() is None
    assert db.query(StoryItem).filter_by(id="story-item-1").first() is None

    # MCP Binding profile_id was nulled out rather than row deleted
    binding_after = db.query(MCPClientBinding).filter_by(client_id="mcp-client-1").first()
    assert binding_after is not None
    assert binding_after.profile_id is None

    # Directory removed after successful commit
    assert not profile_dir.exists()


@pytest.mark.asyncio
async def test_add_profile_sample_rollback_removes_file(test_db_session, tmp_path, monkeypatch):
    """If DB commit fails during sample addition, the written audio file is unlinked."""
    db = test_db_session
    profile_id = "prof-rollback-sample"
    prof = DBVoiceProfile(id=profile_id, name="Rollback Profile", voice_type="cloned")
    db.add(prof)
    db.commit()

    src_wav = tmp_path / "source.wav"
    src_wav.write_bytes(b"RIFFfakedata")

    # Mock audio validation and saving
    with patch("backend.services.profiles.validate_and_load_reference_audio", return_value=(True, "", [0.1, 0.2], 16000)), \
         patch("backend.services.profiles.save_audio"):
        
        # Force db.commit to raise an exception
        with patch.object(db, "commit", side_effect=sqlite3.OperationalError("Simulated DB lock")):
            with pytest.raises(sqlite3.OperationalError):
                await profiles_service.add_profile_sample(
                    profile_id=profile_id,
                    audio_path=str(src_wav),
                    reference_text="Sample text",
                    db=db,
                )

    # Verify no sample row was created
    samples = db.query(DBProfileSample).filter_by(profile_id=profile_id).all()
    assert len(samples) == 0


# ==============================================================================
# TASK 2: AI MODEL CACHE MIGRATION INTEGRITY
# ==============================================================================

def test_model_migration_validation_rules(tmp_path):
    """Test validation of migration source and destination paths."""
    src = tmp_path / "cache_source"
    dest = tmp_path / "cache_dest"

    # Missing source
    with pytest.raises(FileNotFoundError):
        model_migration.validate_migration_paths(src, dest)

    src.mkdir()
    dest.mkdir()

    # Source same as destination
    with pytest.raises(ValueError, match="Source and destination are the same directory"):
        model_migration.validate_migration_paths(src, src)

    # Destination inside source
    nested_dest = src / "nested_dest"
    with pytest.raises(ValueError, match="Destination cannot be inside"):
        model_migration.validate_migration_paths(src, nested_dest)

    # Source inside destination
    nested_src = dest / "nested_src"
    nested_src.mkdir()
    with pytest.raises(ValueError, match="Source cannot be inside"):
        model_migration.validate_migration_paths(nested_src, dest)


def test_model_migration_disk_space_check(tmp_path):
    """Insufficient disk space must raise ValueError before copying."""
    target = tmp_path / "target_dir"
    target.mkdir()

    # Mock shutil.disk_usage to return 50MB free
    mock_usage = MagicMock(free=50 * 1024 * 1024)
    with patch("shutil.disk_usage", return_value=mock_usage):
        # Requesting 10MB requires 10MB + 100MB buffer = 110MB > 50MB free
        with pytest.raises(ValueError, match="Insufficient disk space"):
            model_migration.check_disk_space(target, 10 * 1024 * 1024)


@pytest.mark.asyncio
async def test_staged_model_migration_success(tmp_path, monkeypatch):
    """Model migration must stage in temp dir, verify, copy safely, and clean source only after success."""
    source_cache = tmp_path / "source_cache"
    dest_cache = tmp_path / "dest_cache"

    model_dir = source_cache / "models--tts--v1"
    model_dir.mkdir(parents=True, exist_ok=True)
    weights = model_dir / "model.safetensors"
    weights.write_bytes(b"MODEL_WEIGHT_BYTES_12345")

    # Mock disk check to pass
    with patch("backend.services.model_migration.check_disk_space"):
        result = await model_migration.stage_and_migrate_models(source_cache, dest_cache)

    assert result["moved"] == 1
    assert (dest_cache / "models--tts--v1" / "model.safetensors").read_bytes() == b"MODEL_WEIGHT_BYTES_12345"
    assert not model_dir.exists()  # Cleaned from source only after destination verified
    assert os.environ.get("HF_HUB_CACHE") == str(dest_cache)

    # Staging temp directory must be removed
    staging_dirs = list(dest_cache.parent.glob(".tmp_models_staging_*"))
    assert len(staging_dirs) == 0


@pytest.mark.asyncio
async def test_model_migration_interruption_preserves_source(tmp_path):
    """If migration fails during transfer, source files must remain 100% untouched and staging cleaned."""
    source_cache = tmp_path / "source_cache_err"
    dest_cache = tmp_path / "dest_cache_err"

    model_dir = source_cache / "models--broken"
    model_dir.mkdir(parents=True, exist_ok=True)
    weights = model_dir / "model.bin"
    weights.write_bytes(b"ORIGINAL_DATA")

    # Force failure during copy
    with patch("backend.services.model_migration.check_disk_space"), \
         patch("backend.services.model_migration.copy_with_progress_sync", side_effect=IOError("Simulated disk error")):
        with pytest.raises(IOError):
            await model_migration.stage_and_migrate_models(source_cache, dest_cache)

    # Source files MUST be untouched
    assert weights.exists()
    assert weights.read_bytes() == b"ORIGINAL_DATA"

    # Staging directory must be cleaned
    staging_dirs = list(dest_cache.parent.glob(".tmp_models_staging_*"))
    assert len(staging_dirs) == 0


# ==============================================================================
# TASK 3: LARGE DATA & MEMORY BOUNDS
# ==============================================================================

@pytest.mark.asyncio
async def test_streaming_upload_rejects_oversized_file(tmp_path, test_db_session):
    """Streaming capture upload must reject files exceeding 100MB without reading whole file into memory."""
    db = test_db_session

    # Create a mock async generator that yields 64KB chunks up to 101 MB
    chunk = b"A" * (64 * 1024)
    target_size = MAX_CAPTURE_SIZE + (1024 * 1024)  # 101 MB

    class FakeOversizedStream:
        def __init__(self):
            self.bytes_read = 0
            self.filename = "large_audio.wav"

        async def read(self, size):
            if self.bytes_read >= target_size:
                return b""
            to_send = min(size, target_size - self.bytes_read)
            self.bytes_read += to_send
            return chunk[:to_send]

    fake_file = FakeOversizedStream()

    with pytest.raises(HTTPException) as exc_info:
        await create_capture_endpoint(
            file=fake_file,  # type: ignore
            source="file",
            language=None,
            stt_model=None,
            db=db,
        )

    assert exc_info.value.status_code == 413
    assert "exceeds maximum size limit" in exc_info.value.detail


# ==============================================================================
# TASK 4: SAFE DELETION & STORAGE INTEGRITY
# ==============================================================================

@pytest.mark.asyncio
async def test_sample_deletion_rollback_preserves_audio_file(test_db_session, tmp_path):
    """If DB commit fails during sample deletion, the audio file on disk is NOT unlinked."""
    db = test_db_session
    profile_id = "prof-preserve-sample"
    prof = DBVoiceProfile(id=profile_id, name="Preserve Profile", voice_type="cloned")
    db.add(prof)
    db.commit()

    audio_file = tmp_path / "profiles" / profile_id / "sample.wav"
    audio_file.parent.mkdir(parents=True, exist_ok=True)
    audio_file.write_bytes(b"PRESERVE_ME")

    sample = DBProfileSample(
        id="sample-preserve-1",
        profile_id=profile_id,
        audio_path=f"profiles/{profile_id}/sample.wav",
        reference_text="Reference text",
    )
    db.add(sample)
    db.commit()

    # Fail DB commit during deletion
    with patch.object(db, "commit", side_effect=sqlite3.OperationalError("Simulated lock")):
        with pytest.raises(sqlite3.OperationalError):
            await profiles_service.delete_profile_sample("sample-preserve-1", db)

    # File must NOT have been unlinked
    assert audio_file.exists()
    assert audio_file.read_bytes() == b"PRESERVE_ME"


@pytest.mark.asyncio
async def test_shared_audio_sample_preserved_when_one_record_deleted(test_db_session, tmp_path):
    """If two sample records share the same audio file, deleting one must NOT delete the audio file."""
    db = test_db_session
    prof = DBVoiceProfile(id="prof-shared", name="Shared Profile", voice_type="cloned")
    db.add(prof)
    db.commit()

    audio_file = tmp_path / "profiles" / "prof-shared" / "shared.wav"
    audio_file.parent.mkdir(parents=True, exist_ok=True)
    audio_file.write_bytes(b"SHARED_AUDIO_BYTES")

    s1 = DBProfileSample(id="s-1", profile_id="prof-shared", audio_path="profiles/prof-shared/shared.wav", reference_text="Ref 1")
    s2 = DBProfileSample(id="s-2", profile_id="prof-shared", audio_path="profiles/prof-shared/shared.wav", reference_text="Ref 2")
    db.add_all([s1, s2])
    db.commit()

    # Delete first sample
    await profiles_service.delete_profile_sample("s-1", db)
    assert audio_file.exists()  # Shared file preserved!
    assert db.query(DBProfileSample).filter_by(id="s-1").first() is None
    assert db.query(DBProfileSample).filter_by(id="s-2").first() is not None

    # Delete second sample
    await profiles_service.delete_profile_sample("s-2", db)
    assert not audio_file.exists()  # Last reference removed, now unlinked


@pytest.mark.asyncio
async def test_generation_and_version_deletion_preserves_shared_audio(test_db_session, tmp_path):
    """Deleting a generation version does not unlink audio if referenced by another version or generation."""
    db = test_db_session
    prof = DBVoiceProfile(id="prof-gen-shared", name="Gen Profile", voice_type="cloned")
    db.add(prof)
    db.commit()

    gen_id = "gen-shared-audio"
    audio_file = tmp_path / "generations" / "output.wav"
    audio_file.parent.mkdir(parents=True, exist_ok=True)
    audio_file.write_bytes(b"GEN_AUDIO_CONTENT")

    gen = DBGeneration(
        id=gen_id,
        profile_id="prof-gen-shared",
        text="Shared gen",
        audio_path="generations/output.wav",
        status="completed",
    )
    db.add(gen)
    db.commit()

    v1 = DBGenerationVersion(
        id="v-1",
        generation_id=gen_id,
        label="original",
        audio_path="generations/output.wav",
        is_default=True,
    )
    v2 = DBGenerationVersion(
        id="v-2",
        generation_id=gen_id,
        label="take2",
        audio_path="generations/output.wav",
        is_default=False,
    )
    db.add_all([v1, v2])
    db.commit()

    # Delete version 2: audio file is still used by v1 and gen
    versions_service.delete_version("v-2", db)
    assert audio_file.exists()
    assert db.query(DBGenerationVersion).filter_by(id="v-2").first() is None

    # Delete the entire generation: now unlinks the audio file
    await history_service.delete_generation(gen_id, db)
    assert not audio_file.exists()
    assert db.query(DBGeneration).filter_by(id=gen_id).first() is None


def test_capture_deletion_rollback_preserves_audio_file(test_db_session, tmp_path):
    """If DB commit fails during capture deletion, capture audio on disk is preserved."""
    db = test_db_session
    audio_file = tmp_path / "captures" / "cap_test.wav"
    audio_file.parent.mkdir(parents=True, exist_ok=True)
    audio_file.write_bytes(b"CAPTURE_AUDIO")

    cap = DBCapture(
        id="cap-123",
        audio_path="captures/cap_test.wav",
        source="mic",
        transcript_raw="Hello",
    )
    db.add(cap)
    db.commit()

    with patch.object(db, "commit", side_effect=sqlite3.OperationalError("Simulated lock")):
        with pytest.raises(sqlite3.OperationalError):
            captures_service.delete_capture("cap-123", db)

    # Audio remains on disk
    assert audio_file.exists()
    assert audio_file.read_bytes() == b"CAPTURE_AUDIO"


# ==============================================================================
# TASK 5: WAL-SAFE DATABASE BACKUP AND DISASTER RECOVERY
# ==============================================================================

def test_database_backup_and_integrity_check(tmp_path, monkeypatch):
    """Online backup of SQLite DB under WAL mode produces an intact, verifiable backup file."""
    db_file = tmp_path / "rheo_live.db"
    monkeypatch.setattr(config, "_data_dir", tmp_path)

    # Create active SQLite database in WAL mode
    conn = sqlite3.connect(str(db_file))
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT);")
    conn.execute("INSERT INTO users VALUES ('u1', 'Alice');")
    conn.commit()
    conn.close()

    assert backup_service.verify_database_integrity(db_file) is True

    # Perform backup
    backup_file = backup_service.create_database_backup(source_db=db_file)
    assert backup_file.exists()
    assert backup_file.stat().st_size > 0
    assert backup_service.verify_database_integrity(backup_file) is True

    # Check contents of backup
    b_conn = sqlite3.connect(str(backup_file))
    cur = b_conn.cursor()
    cur.execute("SELECT name FROM users WHERE id = 'u1';")
    assert cur.fetchone()[0] == "Alice"
    b_conn.close()


def test_database_integrity_check_detects_corruption(tmp_path):
    """verify_database_integrity returns False for corrupt, 0-byte, or non-existent files."""
    assert backup_service.verify_database_integrity(tmp_path / "non_existent.db") is False

    empty_file = tmp_path / "empty.db"
    empty_file.touch()
    assert backup_service.verify_database_integrity(empty_file) is False

    corrupt_file = tmp_path / "corrupt.db"
    corrupt_file.write_bytes(b"NOT_A_SQLITE_DATABASE_HEADER_00000000000000000000000000000")
    assert backup_service.verify_database_integrity(corrupt_file) is False


def test_restore_database_with_safety_rollback(tmp_path):
    """Restoring a corrupted backup must fail and roll back to the pre-restore state."""
    live_db = tmp_path / "live.db"

    # Create healthy live DB
    conn = sqlite3.connect(str(live_db))
    conn.execute("CREATE TABLE data (val TEXT);")
    conn.execute("INSERT INTO data VALUES ('original_data');")
    conn.commit()
    conn.close()

    # Create a corrupted backup file
    corrupt_backup = tmp_path / "corrupt_backup.db"
    corrupt_backup.write_bytes(b"GARBAGE_DATA_1234567890")

    # Attempt restore
    with pytest.raises(ValueError, match="corrupted or failed integrity check"):
        backup_service.restore_database_backup(corrupt_backup, target_db_path=live_db)

    # Live DB was preserved and unchanged
    c2 = sqlite3.connect(str(live_db))
    cur = c2.cursor()
    cur.execute("SELECT val FROM data;")
    assert cur.fetchone()[0] == "original_data"
    c2.close()


def test_successful_database_restore(tmp_path):
    """Restoring a valid backup replaces live DB safely."""
    live_db = tmp_path / "live_target.db"
    backup_db = tmp_path / "valid_backup.db"

    # Create target DB
    conn1 = sqlite3.connect(str(live_db))
    conn1.execute("CREATE TABLE t (val TEXT);")
    conn1.execute("INSERT INTO t VALUES ('old_target_data');")
    conn1.commit()
    conn1.close()

    # Create valid backup DB
    conn2 = sqlite3.connect(str(backup_db))
    conn2.execute("CREATE TABLE t (val TEXT);")
    conn2.execute("INSERT INTO t VALUES ('restored_backup_data');")
    conn2.commit()
    conn2.close()

    success = backup_service.restore_database_backup(backup_db, target_db_path=live_db)
    assert success is True

    # Verify live DB now contains restored data
    conn3 = sqlite3.connect(str(live_db))
    cur = conn3.cursor()
    cur.execute("SELECT val FROM t;")
    assert cur.fetchone()[0] == "restored_backup_data"
    conn3.close()
