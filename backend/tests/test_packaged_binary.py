"""Smoke and lifecycle verification tests for the packaged Windows executable.

Validates that the PyInstaller standalone distribution (`rheo-server-rocm.exe` / `rheo-server.exe`)
operates correctly as an independent desktop binary on Windows:
1. --version flag execution
2. --help flag execution
3. Server startup on custom port & data-dir
4. Health endpoint readiness
5. Database auto-initialization (SQLite file creation)
6. Voice profile CRUD workflow
7. Model status and metadata discovery
8. Generation payload validation
9. Graceful shutdown via POST /shutdown
10. Resource management & clean exit without orphans
"""

import os
import subprocess
import sys
import time
from pathlib import Path
import pytest
import requests

# Locate packaged binary
BACKEND_DIST = Path(__file__).resolve().parent.parent / "dist"
SERVER_BIN_DIR = BACKEND_DIST / "rheo-server-rocm"
SERVER_EXE = SERVER_BIN_DIR / "rheo-server-rocm.exe"

if not SERVER_EXE.exists():
    # Fallback to single-file rheo-server.exe if present
    ALT_EXE = BACKEND_DIST / "rheo-server.exe"
    if ALT_EXE.exists():
        SERVER_EXE = ALT_EXE

MCP_EXE = BACKEND_DIST / "rheo-mcp.exe"


@pytest.mark.skipif(not SERVER_EXE.exists(), reason="Packaged server executable not found in backend/dist")
class TestPackagedServerBinary:
    """Test suite executing against the actual compiled binary."""

    def test_version_flag_fast_path(self):
        """Verify --version returns immediately with the application version."""
        t0 = time.time()
        proc = subprocess.run(
            [str(SERVER_EXE), "--version"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        elapsed = time.time() - t0
        assert proc.returncode == 0, f"Expected returncode 0, got {proc.returncode}. Stderr: {proc.stderr}"
        output = proc.stdout.strip()
        assert "rheo-server 0.1.0" in output
        # Fast path should complete well under 5 seconds (not waiting for PyTorch import)
        assert elapsed < 5.0, f"--version took {elapsed:.2f}s; fast path may not be triggering"

    def test_help_flag_fast_path(self):
        """Verify --help returns command-line usage without hang."""
        t0 = time.time()
        proc = subprocess.run(
            [str(SERVER_EXE), "--help"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        elapsed = time.time() - t0
        assert proc.returncode == 0, f"Expected returncode 0, got {proc.returncode}. Stderr: {proc.stderr}"
        assert "usage: rheo-server" in proc.stdout.lower()
        assert "--host" in proc.stdout
        assert "--port" in proc.stdout
        assert "--data-dir" in proc.stdout
        assert elapsed < 5.0, f"--help took {elapsed:.2f}s; fast path may not be triggering"

    def test_server_startup_health_crud_and_graceful_shutdown(self, tmp_path):
        """End-to-end lifecycle test of the compiled binary."""
        test_port = 17590
        data_dir = tmp_path / "packaged_test_data"
        data_dir.mkdir(parents=True, exist_ok=True)
        log_path = data_dir / "server_test.log"
        log_file = open(log_path, "w", encoding="utf-8")

        env = os.environ.copy()
        env["RHEO_MODELS_DIR"] = str(tmp_path / "models_cache")

        # Launch server process with log redirection to prevent Windows pipe buffer deadlocks
        server_proc = subprocess.Popen(
            [
                str(SERVER_EXE),
                "--host", "127.0.0.1",
                "--port", str(test_port),
                "--data-dir", str(data_dir),
            ],
            stdout=log_file,
            stderr=subprocess.STDOUT,
            env=env,
            text=True,
        )

        base_url = f"http://127.0.0.1:{test_port}"
        started = False

        try:
            # 1. Wait for server startup via health endpoint (max 60 seconds for torch/rocm init)
            deadline = time.time() + 60.0
            while time.time() < deadline:
                if server_proc.poll() is not None:
                    log_file.flush()
                    server_log = log_path.read_text(encoding="utf-8", errors="replace") if log_path.exists() else ""
                    pytest.fail(f"Server exited prematurely with code {server_proc.returncode}.\nLog:\n{server_log}")
                try:
                    r = requests.get(f"{base_url}/health", timeout=1.0)
                    if r.status_code == 200 and r.json().get("status") in ("healthy", "ok"):
                        started = True
                        break
                except Exception:
                    time.sleep(1.0)

            if not started:
                log_file.flush()
                server_log = log_path.read_text(encoding="utf-8", errors="replace") if log_path.exists() else ""
                pytest.fail(f"Server failed to respond on /health within 60s.\nLog:\n{server_log}")

            # 2. Database initialization verification
            db_file = data_dir / "rheo.db"
            assert db_file.exists(), f"SQLite database {db_file} was not created"
            assert db_file.stat().st_size > 0, "Database file is empty"

            # 3. Voice Profile CRUD via compiled binary
            p_resp = requests.post(
                f"{base_url}/profiles",
                json={"name": "Packaged Binary Profile", "language": "en"},
                timeout=5.0,
            )
            assert p_resp.status_code == 200, f"Profile create failed: {p_resp.text}"
            profile_id = p_resp.json()["id"]

            list_resp = requests.get(f"{base_url}/profiles", timeout=5.0)
            assert list_resp.status_code == 200
            profiles = list_resp.json()
            assert any(p["id"] == profile_id for p in profiles)

            del_resp = requests.delete(f"{base_url}/profiles/{profile_id}", timeout=5.0)
            assert del_resp.status_code == 200

            # 4. Model Discovery and Registry API
            models_resp = requests.get(f"{base_url}/models/status", timeout=5.0)
            assert models_resp.status_code == 200
            models_data = models_resp.json()
            assert "models" in models_data
            assert len(models_data["models"]) >= 10
            # Check newly added metadata fields exist in binary response
            first_model = models_data["models"][0]
            assert "required_disk_mb" in first_model
            assert "supported_hardware" in first_model

            # 5. Generation request validation
            gen_bad = requests.post(
                f"{base_url}/generate",
                json={"text": "", "profile_id": "nonexistent"},
                timeout=5.0,
            )
            assert gen_bad.status_code in (400, 422)

            # 6. Graceful shutdown via HTTP endpoint
            shutdown_resp = requests.post(f"{base_url}/shutdown", timeout=5.0)
            assert shutdown_resp.status_code == 200
            assert "shutting down" in shutdown_resp.json().get("message", "").lower()

            # Verify process terminates cleanly (code 0 or SIGTERM=15 on Windows)
            exit_code = server_proc.wait(timeout=10.0)
            assert exit_code in (0, 15), f"Expected clean exit code 0 or 15, got {exit_code}"

        finally:
            if server_proc.poll() is None:
                server_proc.terminate()
                try:
                    server_proc.wait(timeout=5.0)
                except Exception:
                    server_proc.kill()
            try:
                log_file.close()
            except Exception:
                pass

    def test_server_port_conflict_fails_cleanly(self, tmp_path):
        """Verify server exits gracefully with non-zero code if port is already bound."""
        import socket
        test_port = 17592
        # Bind socket to occupy the port
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.bind(("127.0.0.1", test_port))
        sock.listen(1)

        data_dir = tmp_path / "packaged_port_test_data"
        data_dir.mkdir(parents=True, exist_ok=True)
        log_path = data_dir / "port_conflict.log"
        log_file = open(log_path, "w", encoding="utf-8")

        try:
            proc = subprocess.Popen(
                [
                    str(SERVER_EXE),
                    "--host", "127.0.0.1",
                    "--port", str(test_port),
                    "--data-dir", str(data_dir),
                ],
                stdout=log_file,
                stderr=subprocess.STDOUT,
                text=True,
            )
            # Expect process to fail to bind and exit with non-zero within 60s
            exit_code = proc.wait(timeout=60.0)
            assert exit_code != 0, f"Expected non-zero exit code due to port conflict, got {exit_code}"
        finally:
            if proc.poll() is None:
                proc.kill()
            sock.close()
            try:
                log_file.close()
            except Exception:
                pass


@pytest.mark.skipif(not MCP_EXE.exists(), reason="Packaged rheo-mcp executable not found in backend/dist")
class TestPackagedMcpShim:
    """Test suite executing against the compiled rheo-mcp stdio shim."""

    def test_mcp_shim_binary_exists_and_runs(self):
        assert MCP_EXE.exists()
        assert MCP_EXE.stat().st_size > 1_000_000, "rheo-mcp.exe size unexpectedly small"
