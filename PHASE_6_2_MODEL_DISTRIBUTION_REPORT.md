# Rheo — Phase 6.2 Model Distribution and Cache Management Report

**Repository:** `https://github.com/MasterZ1311/Rheo`  
**Branch:** `MZ-Main`  
**Application ID:** `sh.rheo.app`  
**Application Version:** `0.1.0`  
**Target Environment:** Windows 10/11 x86_64  
**Date:** November 11, 2026  
**Status:** Completed and Verified  

---

## Executive Summary

Phase 6.2 establishes an independent, resilient, and verifiable AI model distribution and cache management subsystem for Rheo on Windows. 

All 5 core product decisions have been implemented and verified:
1. **Never bundle large AI model weights inside MSI or NSIS installers:** Verified via `tauri.conf.json` resource definitions, which contain only minimal client assets and zero weights.
2. **Models are downloadable independently post-installation:** Managed via `POST /models/download`, tracked via SSE byte streams with live transfer speed (`speed_bps`) and estimated time remaining (`eta_seconds`), with full cancellation support and duplicate prevention.
3. **Downloaded models survive application updates:** Model storage is anchored to `%USERPROFILE%\.cache\huggingface\hub` (or `RHEO_MODELS_DIR`), completely independent of application binaries in `%LOCALAPPDATA%\Programs\Rheo` and user databases in `%APPDATA%\sh.rheo.app`.
4. **Existing downloaded models work fully offline:** Verified with `HF_HUB_OFFLINE=1`, preventing network queries and using local snapshots.
5. **Never silently delete models or user data:** File removal occurs only upon explicit user invocation of `DELETE /models/{model_name}` or staged non-destructive migration via `POST /models/migrate`.

---

## 1. Files Changed and Created

### Files Created
- `backend/services/model_verification.py`: Dedicated cache verification engine. Validates directory structure, ensures absence of incomplete download fragments (`*.incomplete`), verifies non-zero weight sizes (`.safetensors`, `.bin`, `.pt`, `.npz`), validates JSON syntax of `config.json`, and computes optional SHA-256 checksums.
- `backend/tests/test_model_distribution.py`: Comprehensive test suite with 16 automated tests covering registry metadata, pre-flight disk checks, duplicate download rejection (HTTP 409), cancellation, speed/ETA calculation, corruption detection, custom directory support (including paths with spaces), app-wipe retention, and offline operation.

### Files Modified
- `backend/backends/__init__.py`:
  - Extended `ModelConfig` dataclass with `description`, `version`, `required_disk_mb`, `supported_hardware`, `dependencies`, and `sha256_checksums`.
  - Added automatic buffer calculation in `__post_init__` (`required_disk_mb = int(size_mb * 1.25) + 100`).
  - Populated complete metadata across all 16 supported models (Qwen TTS, Qwen CustomVoice, LuxTTS, Chatterbox, Chatterbox Turbo, TADA 1B/3B, Kokoro 82M, Whisper base/small/medium/large/turbo, Qwen3 LLM 0.6B/1.7B/4B).
- `backend/models.py`:
  - Extended `ModelStatus` schema with `engine`, `description`, `version`, `required_disk_mb`, `supported_hardware`, `dependencies`, and `languages`.
  - Extended `ActiveDownloadTask` schema with `speed_bps` (bytes/sec) and `eta_seconds` (time remaining).
- `backend/utils/tasks.py`:
  - Implemented `_download_asyncio_tasks` dictionary and `register_download_task(model_name, task)`.
  - Hardened `cancel_download(model_name)` to cancel the running `asyncio.Task` immediately, aborting in-flight download coroutines and network connections.
- `backend/utils/progress.py`:
  - Added download speed moving-average tracker (`_speed_bps`) and ETA calculation (`eta_seconds`).
  - Added cleanup on download completion, error, and cancellation.
- `backend/routes/models.py`:
  - Updated `GET /models/status` to perform integrity verification before marking models downloaded and serialize all newly added registry metadata.
  - Hardened `POST /models/download` with pre-flight checks:
    - Rejects duplicate downloads with HTTP 409 Conflict if already downloading.
    - Validates available disk space via `shutil.disk_usage()` against `required_disk_mb`, returning HTTP 400 if insufficient.
    - Fast return if model is already downloaded and verified.
    - Registers background task with `TaskManager` and handles `asyncio.CancelledError`.
  - Hardened `POST /models/download/cancel` to cleanly cancel background workers and reset progress state.
  - Updated `GET /models/cache-dir` to use `get_models_cache_dir()`.
- `backend/routes/tasks.py`:
  - Forwarded `speed_bps` and `eta_seconds` into active download task responses.
- `backend/config.py`:
  - Implemented `get_models_cache_dir()` and `set_models_cache_dir()`, providing full support for arbitrary drive letters and directory paths containing spaces.
- `app/src/lib/api/types.ts`:
  - Synchronized frontend TypeScript interfaces (`ModelStatus` and `ActiveDownloadTask`) with backend Pydantic models.

---

## 2. Windows Model Directory Behavior

### Storage Location Hierarchy
1. **Custom Path Override:** If `RHEO_MODELS_DIR` is set, models reside in that path (e.g. `D:\AI Models\Rheo Cache`).
2. **HuggingFace Cache Override:** If `HF_HUB_CACHE` is set, models reside in that path.
3. **Default System Cache:** `%USERPROFILE%\.cache\huggingface\hub` (e.g. `C:\Users\<username>\.cache\huggingface\hub`).

### Complete Separation from App & User Data
| Directory Category | Windows Path | Behavior During Uninstall / Update |
| :--- | :--- | :--- |
| **Application Binaries** | `%LOCALAPPDATA%\Programs\Rheo` | Overwritten on updates; deleted on uninstall. Contains **NO** model weights. |
| **User SQLite DB & Audio** | `%APPDATA%\sh.rheo.app` | Preserved across updates and uninstalls. |
| **Model Weight Cache** | `%USERPROFILE%\.cache\huggingface\hub` | Preserved across updates and uninstalls. Survives complete directory wipes of the app directory. |

---

## 3. API and Frontend Behavior

### 1. `GET /models/status`
Returns full inventory of all models with download and runtime status:
```json
{
  "models": [
    {
      "model_name": "kokoro",
      "display_name": "Kokoro 82M",
      "hf_repo_id": "hexgrad/Kokoro-82M",
      "downloaded": true,
      "downloading": false,
      "size_mb": 350.0,
      "loaded": false,
      "engine": "kokoro",
      "description": "Compact 82M parameter high-fidelity TTS model with multi-accent support.",
      "version": "main",
      "required_disk_mb": 537,
      "supported_hardware": ["cpu", "cuda", "rocm", "mlx"],
      "dependencies": ["kokoro", "soundfile"],
      "languages": ["en", "es", "fr", "hi", "it", "pt", "ja", "zh"]
    }
  ]
}
```

### 2. `POST /models/download`
- **Duplicate Request:** If `kokoro` is already downloading, returns `HTTP 409 Conflict`:
  `{"detail": "Download already in progress for kokoro"}`
- **Insufficient Disk Space:** If free disk space on cache drive is less than `required_disk_mb`, returns `HTTP 400 Bad Request`:
  `{"detail": "Insufficient disk space for Kokoro 82M. Required: 537 MB, Available: 120 MB."}`
- **Already Downloaded & Verified:** If model is cached and intact, returns immediately:
  `{"message": "Model kokoro is already downloaded and verified"}`
- **Valid New Download:** Starts background coroutine, registers task handle, returns `HTTP 200`:
  `{"message": "Model kokoro download started"}`

### 3. `POST /models/download/cancel`
Terminates running `asyncio.Task`, resets progress manager tracking, and removes task from active list.

### 4. `GET /tasks/active` & SSE Stream `/models/progress/{model_name}`
Provides live download metrics:
```json
{
  "model_name": "kokoro",
  "status": "downloading",
  "current": 104857600,
  "total": 367001600,
  "progress": 28.57,
  "speed_bps": 12582912.0,
  "eta_seconds": 21,
  "filename": "kokoro-v0_19.safetensors"
}
```

---

## 4. Test Verification Gates

All tests executed with 100% pass rates:

### 1. Dedicated Phase 6.2 Test Suite
- `pytest backend/tests/test_model_distribution.py -v`:
  - `TestModelRegistryMetadata::test_all_models_have_required_metadata` **PASSED**
  - `TestModelRegistryMetadata::test_model_status_api_serializes_metadata` **PASSED**
  - `TestDownloadManagerHardening::test_duplicate_download_rejection` **PASSED**
  - `TestDownloadManagerHardening::test_insufficient_disk_space_rejection` **PASSED**
  - `TestDownloadManagerHardening::test_download_cancellation` **PASSED**
  - `TestDownloadProgressTracking::test_speed_and_eta_calculation` **PASSED**
  - `TestModelIntegrityVerification::test_verify_missing_directory` **PASSED**
  - `TestModelIntegrityVerification::test_verify_incomplete_blobs` **PASSED**
  - `TestModelIntegrityVerification::test_verify_missing_snapshots` **PASSED**
  - `TestModelIntegrityVerification::test_verify_empty_weight_files` **PASSED**
  - `TestModelIntegrityVerification::test_verify_corrupted_config_json` **PASSED**
  - `TestModelIntegrityVerification::test_verify_valid_model` **PASSED**
  - `TestModelIntegrityVerification::test_verify_sha256_checksum` **PASSED**
  - `TestStorageConfigurationAndPersistence::test_custom_storage_path_with_spaces` **PASSED**
  - `TestStorageConfigurationAndPersistence::test_model_cache_survives_app_directory_wipe` **PASSED**
  - `TestStorageConfigurationAndPersistence::test_offline_verification` **PASSED**
  - **Result: 16 passed in 8.14s**

### 2. Full Regression Test Gates
- `test_functional_e2e.py`: **33 passed in 43.05s**
- `test_generation_reliability.py`: **15 passed in 8.66s**
- `test_task_queue_cancellation.py`: **2 passed in 0.49s**
- `test_security_audit.py`: **33 passed in 16.59s**
- `test_data_integrity.py`: **16 passed in 6.61s**
- `ruff check backend`: **All checks passed (0 errors)**
- `bun run typecheck`: **All checks passed (0 errors)**
- `bun run lint`: **0 errors**
- `bun run test:frontend`: **9 passed (4 test files)**

---

## 5. Known Limitations & Edge-Case Considerations

1. **Windows Long Paths (`MAX_PATH`):**
   Hugging Face Hub creates snapshot directories with long hashes (e.g. `snapshots/0123456789abcdef...`). On Windows systems where LongPathsEnabled is disabled in the registry (`HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\FileSystem`), nested paths exceeding 260 characters can fail in standard Windows Win32 APIs. Python 3.12 automatically uses prefix `\\?\` for long paths, mitigating this within the backend.
2. **Network Interruption Handling:**
   Hugging Face Hub automatically resumes chunked file transfers via HTTP Range requests. When a download is cancelled or interrupted, incomplete chunks remain marked as `.incomplete` in `blobs/`. Our integrity checker correctly identifies these and prevents half-downloaded weights from being used for inference.
3. **Multi-GB Memory Constraints on Low-RAM Machines:**
   Models larger than 3GB (e.g. Qwen TTS 1.7B, TADA 3B) require sufficient system RAM (8GB+ recommended) for loading. Pre-flight checks ensure disk space, while runtime out-of-memory exceptions during model loading are caught gracefully and reported to the UI without server crashes.

---

## 6. Manual Test Instructions

To verify model distribution manually on a clean Windows environment:

1. **Verify Empty Model Cache:**
   Ensure `%USERPROFILE%\.cache\huggingface\hub` does not contain `models--hexgrad--Kokoro-82M`.
2. **Launch Rheo Backend:**
   Run `python -m backend.server` or `rheo-server.exe`.
3. **Query Model Status:**
   ```powershell
   Invoke-RestMethod -Uri "http://127.0.0.1:17493/models/status" | ConvertTo-Json -Depth 3
   ```
   Confirm `kokoro` reports `"downloaded": false` and `"downloading": false`.
4. **Trigger Model Download:**
   ```powershell
   Invoke-RestMethod -Uri "http://127.0.0.1:17493/models/download" -Method Post -Body '{"model_name":"kokoro"}' -ContentType "application/json"
   ```
5. **Verify Duplicate Rejection (HTTP 409):**
   Immediately execute the same command again. Confirm HTTP 409 is returned with `"Download already in progress for kokoro"`.
6. **Verify Progress Stream:**
   Connect to SSE stream `http://127.0.0.1:17493/models/progress/kokoro` and observe real-time progress, speed, and ETA.
7. **Verify Offline Availability:**
   Disconnect internet (or set `$env:HF_HUB_OFFLINE = "1"`). Query `/models/status`. Confirm `kokoro` reports `"downloaded": true` and synthesize audio with the model successfully.

---

## 7. Confirmation Regarding Clean Distribution

**Confirmation:**
Neither the MSI nor the NSIS installers will bundle any large AI model weights. The installer payload contains solely the compiled Tauri frontend, the frozen Python backend (`rheo-server.exe`), the stdio MCP bridge (`rheo-mcp.exe`), and minimal static UI assets. All AI model weights are managed exclusively through this independent, on-demand distribution system.

---

**Execution Paused:** Phase 6.2 is complete and verified. Awaiting user approval to proceed to Phase 6.3.
