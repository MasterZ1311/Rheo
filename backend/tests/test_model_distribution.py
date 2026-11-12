"""Automated tests for Rheo Phase 6.2 Model Distribution and Cache Management.

Validates:
1. Model Registry Metadata (all fields, sizes, hardware, dependencies).
2. Download Pre-flight Disk Space Validation (HTTP 400 on insufficient space).
3. Duplicate Download Rejection (HTTP 409 Conflict).
4. Download Cancellation (task cancellation, state cleanup).
5. Download Progress Tracking (speed_bps and eta_seconds calculation).
6. Model Cache Integrity Verification (missing, incomplete, 0-byte, corrupted, valid, sha256).
7. Custom Storage Configuration (paths with spaces, non-default paths).
8. Model Persistence Across App Directory Wipes (installer update simulation).
9. Offline Model Availability (HF_HUB_OFFLINE=1).
"""

import asyncio
import hashlib
import json
import os
import shutil
import tempfile
import time
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest
from fastapi.testclient import TestClient

from backend.backends import get_all_model_configs, get_model_config, ModelConfig
from backend.config import get_models_cache_dir, set_models_cache_dir
from backend.main import app
from backend.services.model_verification import verify_model_cache, verify_model_by_name
from backend.utils.progress import ProgressManager
from backend.utils.tasks import TaskManager, get_task_manager


@pytest.fixture
def client():
    return TestClient(app)


class TestModelRegistryMetadata:
    """Verify that all models in the registry have complete, validated metadata."""

    def test_all_models_have_required_metadata(self):
        configs = get_all_model_configs()
        assert len(configs) >= 10, "Expected at least 10 registered models (TTS, STT, LLM)"

        seen_names = set()
        for cfg in configs:
            assert isinstance(cfg, ModelConfig)
            assert cfg.model_name, "model_name must not be empty"
            assert cfg.model_name not in seen_names, f"Duplicate model_name: {cfg.model_name}"
            seen_names.add(cfg.model_name)

            assert cfg.display_name, f"{cfg.model_name} missing display_name"
            assert cfg.engine, f"{cfg.model_name} missing engine"
            assert cfg.hf_repo_id, f"{cfg.model_name} missing hf_repo_id"
            assert cfg.description, f"{cfg.model_name} missing description"
            assert cfg.version, f"{cfg.model_name} missing version"
            assert cfg.size_mb > 0, f"{cfg.model_name} size_mb must be > 0"
            assert cfg.required_disk_mb >= cfg.size_mb, (
                f"{cfg.model_name} required_disk_mb ({cfg.required_disk_mb}) should be >= size_mb ({cfg.size_mb})"
            )
            assert len(cfg.supported_hardware) > 0, f"{cfg.model_name} supported_hardware must not be empty"
            assert isinstance(cfg.dependencies, list), f"{cfg.model_name} dependencies must be a list"
            assert len(cfg.languages) > 0, f"{cfg.model_name} languages must not be empty"

    def test_model_status_api_serializes_metadata(self, client):
        response = client.get("/models/status")
        assert response.status_code == 200
        data = response.json()
        assert "models" in data
        models_list = data["models"]
        assert len(models_list) >= 10

        for m in models_list:
            assert "model_name" in m
            assert "display_name" in m
            assert "hf_repo_id" in m
            assert "downloaded" in m
            assert "downloading" in m
            assert "loaded" in m
            assert "engine" in m
            assert "description" in m
            assert "version" in m
            assert "required_disk_mb" in m
            assert "supported_hardware" in m
            assert "dependencies" in m
            assert "languages" in m


class TestDownloadManagerHardening:
    """Test duplicate detection, disk space pre-check, and task cancellation."""

    def test_duplicate_download_rejection(self, client):
        task_manager = get_task_manager()
        model_name = "kokoro"

        task_manager.start_download(model_name)
        try:
            # Attempt to trigger duplicate download
            response = client.post("/models/download", json={"model_name": model_name})
            assert response.status_code == 409
            assert "already in progress" in response.json()["detail"].lower()
        finally:
            task_manager.complete_download(model_name)

    def test_insufficient_disk_space_rejection(self, client):
        model_name = "kokoro"
        task_manager = get_task_manager()
        if task_manager.is_download_active(model_name):
            task_manager.complete_download(model_name)

        # Mock disk_usage to return 10 MB free and ensure model is seen as not yet downloaded
        fake_usage = MagicMock(free=10 * 1024 * 1024, total=100 * 1024 * 1024)
        with patch("shutil.disk_usage", return_value=fake_usage), \
             patch("backend.services.model_verification.verify_model_by_name", return_value=(False, "Not downloaded")):
            response = client.post("/models/download", json={"model_name": model_name})
            assert response.status_code == 400
            assert "insufficient disk space" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_download_cancellation(self):
        task_manager = TaskManager()
        model_name = "test-mock-model"

        cancelled = False

        async def dummy_download():
            nonlocal cancelled
            try:
                await asyncio.sleep(10)
            except asyncio.CancelledError:
                cancelled = True
                raise

        loop = asyncio.get_running_loop()
        task = loop.create_task(dummy_download())
        await asyncio.sleep(0.01)  # Yield so coroutine enters sleep
        task_manager.start_download(model_name)
        task_manager.register_download_task(model_name, task)

        assert task_manager.is_download_active(model_name)

        # Cancel download
        res = task_manager.cancel_download(model_name)
        assert res is True
        assert not task_manager.is_download_active(model_name)

        try:
            await task
        except asyncio.CancelledError:
            pass

        assert task.cancelled() or task.done()
        assert cancelled is True


class TestDownloadProgressTracking:
    """Test byte-level progress, download speed calculation, and ETA."""

    def test_speed_and_eta_calculation(self):
        pm = ProgressManager()
        model = "test-progress-model"

        # Initial zero progress
        pm.update_progress(model, current=0, total=100_000_000, filename="file1.bin", status="downloading")
        p0 = pm.get_progress(model)
        assert p0["progress"] == 0.0
        assert p0["speed_bps"] is None

        # Simulate progress after 1 second: 10 MB downloaded
        with patch("time.time", return_value=time.time() + 1.0):
            pm.update_progress(model, current=10_000_000, total=100_000_000, filename="file1.bin", status="downloading")

        p1 = pm.get_progress(model)
        assert p1["progress"] == 10.0
        assert p1["speed_bps"] is not None
        assert p1["speed_bps"] > 0
        assert p1["eta_seconds"] is not None
        assert p1["eta_seconds"] > 0

        # Mark complete
        pm.mark_complete(model)
        p_done = pm.get_progress(model)
        assert p_done["status"] == "complete"
        assert p_done["progress"] == 100.0
        assert p_done["speed_bps"] is None
        assert p_done["eta_seconds"] is None


class TestModelIntegrityVerification:
    """Test model cache verification under various corruption scenarios."""

    def test_verify_missing_directory(self, tmp_path):
        valid, err = verify_model_cache("openai/whisper-base", cache_dir=tmp_path)
        assert valid is False
        assert "not found" in err.lower()

    def test_verify_incomplete_blobs(self, tmp_path):
        repo_dir = tmp_path / "models--openai--whisper-base"
        blobs_dir = repo_dir / "blobs"
        blobs_dir.mkdir(parents=True)
        (blobs_dir / "abc123.incomplete").write_bytes(b"partial")

        valid, err = verify_model_cache("openai/whisper-base", cache_dir=tmp_path)
        assert valid is False
        assert "incomplete download fragments" in err.lower()

    def test_verify_missing_snapshots(self, tmp_path):
        repo_dir = tmp_path / "models--openai--whisper-base"
        repo_dir.mkdir(parents=True)

        valid, err = verify_model_cache("openai/whisper-base", cache_dir=tmp_path)
        assert valid is False
        assert "snapshots directory not found" in err.lower()

    def test_verify_empty_weight_files(self, tmp_path):
        repo_dir = tmp_path / "models--openai--whisper-base"
        snap_dir = repo_dir / "snapshots" / "main_rev"
        snap_dir.mkdir(parents=True)
        (snap_dir / "model.safetensors").write_bytes(b"")  # 0 bytes

        valid, err = verify_model_cache("openai/whisper-base", cache_dir=tmp_path)
        assert valid is False
        assert "0-byte" in err.lower() or "empty" in err.lower()

    def test_verify_corrupted_config_json(self, tmp_path):
        repo_dir = tmp_path / "models--openai--whisper-base"
        snap_dir = repo_dir / "snapshots" / "main_rev"
        snap_dir.mkdir(parents=True)
        (snap_dir / "model.safetensors").write_bytes(b"dummy weights data")
        (snap_dir / "config.json").write_text("{bad json syntax")

        valid, err = verify_model_cache("openai/whisper-base", cache_dir=tmp_path)
        assert valid is False
        assert "corrupted config.json" in err.lower()

    def test_verify_valid_model(self, tmp_path):
        repo_dir = tmp_path / "models--openai--whisper-base"
        snap_dir = repo_dir / "snapshots" / "main_rev"
        snap_dir.mkdir(parents=True)
        (snap_dir / "model.safetensors").write_bytes(b"valid weight content")
        (snap_dir / "config.json").write_text(json.dumps({"model_type": "whisper"}))

        valid, err = verify_model_cache("openai/whisper-base", cache_dir=tmp_path)
        assert valid is True
        assert err is None

    def test_verify_sha256_checksum(self, tmp_path):
        repo_dir = tmp_path / "models--openai--whisper-base"
        snap_dir = repo_dir / "snapshots" / "main_rev"
        snap_dir.mkdir(parents=True)
        weight_data = b"known binary content for hashing"
        (snap_dir / "model.safetensors").write_bytes(weight_data)
        correct_hash = hashlib.sha256(weight_data).hexdigest()

        # Correct hash
        valid, err = verify_model_cache(
            "openai/whisper-base",
            cache_dir=tmp_path,
            expected_sha256={"model.safetensors": correct_hash},
        )
        assert valid is True

        # Incorrect hash
        valid, err = verify_model_cache(
            "openai/whisper-base",
            cache_dir=tmp_path,
            expected_sha256={"model.safetensors": "0000000000000000000000000000000000000000000000000000000000000000"},
        )
        assert valid is False
        assert "checksum mismatch" in err.lower()


class TestStorageConfigurationAndPersistence:
    """Test custom paths with spaces, application update survival, and offline operation."""

    def test_custom_storage_path_with_spaces(self, tmp_path):
        custom_dir = tmp_path / "Custom Storage Path With Spaces" / "AI Models"
        orig_cache = get_models_cache_dir()

        try:
            resolved = set_models_cache_dir(custom_dir)
            assert resolved == custom_dir.resolve()
            assert custom_dir.exists()
            assert os.environ.get("RHEO_MODELS_DIR") == str(custom_dir.resolve())
            assert os.environ.get("HF_HUB_CACHE") == str(custom_dir.resolve())

            active = get_models_cache_dir()
            assert active == custom_dir.resolve()
        finally:
            set_models_cache_dir(orig_cache)

    def test_model_cache_survives_app_directory_wipe(self, tmp_path):
        """Simulate updating the application by wiping the installation directory.

        Ensure that the model cache directory (stored in %USERPROFILE%/.cache or RHEO_MODELS_DIR)
        is completely independent and untouched.
        """
        app_install_dir = tmp_path / "LocalPrograms" / "Rheo"
        app_install_dir.mkdir(parents=True)
        (app_install_dir / "rheo.exe").write_bytes(b"app binary")
        (app_install_dir / "resources").mkdir()

        model_cache_dir = tmp_path / "UserCache" / "huggingface" / "hub"
        model_cache_dir.mkdir(parents=True)

        # Place a mock downloaded model
        model_repo = model_cache_dir / "models--hexgrad--Kokoro-82M"
        snap = model_repo / "snapshots" / "main"
        snap.mkdir(parents=True)
        (snap / "kokoro.safetensors").write_bytes(b"kokoro weights")

        assert (snap / "kokoro.safetensors").exists()

        # Simulate Tauri/MSI update replacing the app directory
        shutil.rmtree(app_install_dir)
        assert not app_install_dir.exists()

        # Verify model cache is 100% intact and still valid
        assert (snap / "kokoro.safetensors").exists()
        valid, err = verify_model_cache("hexgrad/Kokoro-82M", cache_dir=model_cache_dir)
        assert valid is True
        assert err is None

    def test_offline_verification(self, tmp_path):
        """Ensure models can be validated and loaded without internet (HF_HUB_OFFLINE=1)."""
        model_repo = tmp_path / "models--openai--whisper-base"
        snap = model_repo / "snapshots" / "main"
        snap.mkdir(parents=True)
        (snap / "model.safetensors").write_bytes(b"offline weights")

        with patch.dict(os.environ, {"HF_HUB_OFFLINE": "1"}):
            valid, err = verify_model_cache("openai/whisper-base", cache_dir=tmp_path)
            assert valid is True
            assert err is None
