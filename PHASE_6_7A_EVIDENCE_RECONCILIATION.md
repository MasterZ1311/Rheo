# RHEO — PHASE 6.7A: RELEASE EVIDENCE RECONCILIATION REPORT

**Auditor:** Senior Windows Desktop Release QA Engineer  
**Repository:** `https://github.com/MasterZ1311/Rheo`  
**Working Branch:** `MZ-Main`  
**Target Platform:** Windows 10 / Windows 11 x86_64  
**App Version:** `0.1.0`  
**Audit Date:** November 11, 2026  

---

## 1. EXACT BUILD IDENTITY

| Property | Value | Evidence / Command |
| :--- | :--- | :--- |
| **Git Commit Hash** | `f5c2555b521aa5f392d5041df8280c63d412a0a9` | `git rev-parse HEAD` |
| **Working Branch** | `MZ-Main` | `git branch --show-current` |
| **Working Tree Status** | Dirty (Contains test suites, documentation, and config reconciliations) | `git status --short` (0 commits pushed) |
| **Application Version** | `0.1.0` | Synchronized across `tauri.conf.json`, `Cargo.toml`, `pyproject.toml`, `package.json` |
| **Tested Build Date** | November 11, 2026 (Installer artifacts: ~15:32–15:38 UTC+5:30) | File metadata in `release/` and `tauri/target/release/bundle/` |
| **Source Revision Match** | **YES (with caveat)** | Tests were executed against the dirty working tree on `MZ-Main`. The source code matches, but the binary bundled into the installers differs from the standalone binary tested in Phase 6.3 (see Section 7). |

---

## 2. RECONCILIATION MASTER TABLE

| Claim from Previous Report | Evidence Located | Independently Verified | Status | Required Action |
| :--- | :--- | :--- | :---: | :--- |
| **1. Model Distribution Tests Passed** | `backend/tests/test_model_distribution.py` | Ran `pytest test_model_distribution.py` (16 passed in 12.64s) | **PASS** | None. Tests are reproducible and robust. |
| **2. Packaged Binary E2E Passed** | `backend/tests/test_packaged_binary.py` | Ran `pytest test_packaged_binary.py` (5 passed in 53.55s) | **PARTIAL** | The test passed against `backend/dist/rheo-server-rocm/`, but the installer actually bundles the older single-file binary from `tauri/src-tauri/binaries/` (see Section 7). |
| **3. NSIS Installer Build & Testing** | `release/Rheo-v0.1.0-windows-x64-setup.exe` | Verified silent install (`/S`), shortcuts, launch, DB creation, persistence, and uninstallation. | **PASS** | None. NSIS installer functions as reported. |
| **4. MSI Installer Build & Testing** | `release/Rheo-v0.1.0-windows-x64.msi` | Replaced administrative extraction (`/a`) with true MSI execution (`msiexec /i ... MSIINSTALLPERUSER=1 ALLUSERS=2 /qn`); verified shortcuts, registry, launch, and uninstall. | **PASS** | Default `perMachine` MSI requires elevation (`1603 / Error 1925` in non-elevated prompt). Document per-user switch or UAC elevation requirement for MSI. |
| **5. Clean Installation Tests A–G** | `scratch/run_clean_test_suite.py` | Inspected script and rerun verification. Environment was scrubbed (`CLEAN_ENV`), not a pristine VM. | **PARTIAL** | Perform smoke verification on a physical/virtual vanilla Windows 11 VM before public release. |
| **6. User Data Isolation** | `%APPDATA%\sh.rheo.app` | Verified directory tree: `rheo.db`, `profiles/`, `generations/`, `captures/`, `models/`. Preserved across uninstall. | **PASS** | None. Storage isolation is solid. |
| **7. Physical Audio & Microphone Capture** | `tauri/src-tauri/src/audio_capture.rs` | Rust code compiles; manual audio loopback verified in GUI, but physical WASAPI capture not automated in headless CI. | **NOT TESTED** | Perform manual validation with physical USB microphone and speaker devices. |
| **8. Real GPU Model Inference** | `backend/backends/pytorch_backend.py` | Host lacks ROCm/CUDA GPU (`rocminfo` failed). Tests ran on CPU fallback with mocked inference per strict prompt rules. | **NOT TESTED** | Validate GPU inference on dedicated physical AMD RDNA2/3 and NVIDIA RTX hardware. |
| **9. Tauri Minisign Updater Signing** | `tauri.conf.json` & `latest.json` | Public key configured (`E1DCABDAB7A53592`). `latest.json` has empty `"signature": ""` because local build used `--no-sign`. | **PARTIAL** | Supply `TAURI_SIGNING_PRIVATE_KEY` in CI to generate signed update manifests. |
| **10. Windows Authenticode Signing** | `release/` binaries & installer files | Executed `Get-AuthenticodeSignature` across all 8 artifacts: all reported `NotSigned`. No Authenticode step in CI. | **FAIL** | Add EV/OV Authenticode signing step to `.github/workflows/release.yml`. |

---

## 3. MSI INSTALLATION VERIFICATION (FULL LIFECYCLE RECONCILIATION)

In previous Phase 6 reports, MSI testing was limited to administrative network extraction (`msiexec /a`). Administrative extraction unpacks payload files without executing Windows Installer standard actions (registry creation, shortcut placement, Add/Remove Programs registration).

During this reconciliation, **actual Windows MSI execution** was performed and tested:

### 3.1 Non-Elevated Standard Execution
- **Command:** `msiexec.exe /i "release\Rheo-v0.1.0-windows-x64.msi" /qn /l*v "$env:TEMP\msi_install.log"`
- **Result:** Exit code `1603`.
- **Log Diagnostics:**
  ```
  Error 1925. You do not have sufficient privileges to complete this installation for all users of the machine.
  Log on as administrator and then retry this installation.
  Action ended: InstallFinalize. Return value 3.
  ```
- **Finding:** The WiX manifest (`main.wxs`) specifies `InstallScope="perMachine"`. When run non-interactively without UAC elevation from a standard command prompt, Windows Installer rejects the installation.

### 3.2 Per-User MSI Execution
- **Command:** `msiexec.exe /i "release\Rheo-v0.1.0-windows-x64.msi" MSIINSTALLPERUSER=1 ALLUSERS=2 /qn /l*v "$env:TEMP\msi_peruser.log"`
- **Result:** **Exit code `0` (Success)**.
- **Verification Evidence:**
  1. **Installation Directory:** Created at `C:\Users\sivak\AppData\Local\Programs\Rheo\`.
  2. **Installed Binaries:** `Rheo.exe` (21,622,784 B), `rheo-server.exe` (530,975,105 B), `rheo-mcp.exe` (21,449,914 B).
  3. **Registry Registration:** Key `HKCU:\Software\rheo\Rheo` created with values:
     - `InstallDir`: `C:\Users\sivak\AppData\Local\Programs\Rheo\`
     - `Desktop Shortcut`: `1`
     - `Start Menu Shortcut`: `1`
     - `Uninstaller Shortcut`: `1`
  4. **Shortcuts:**
     - Desktop shortcut created: `C:\Users\sivak\Desktop\Rheo.lnk`.
     - Start Menu shortcut created: `C:\Users\sivak\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Rheo\Rheo.lnk` with `System.AppUserModel.ID = "sh.rheo.app"`.
  5. **Application & Backend Launch:**
     - Launched `C:\Users\sivak\AppData\Local\Programs\Rheo\Rheo.exe`.
     - Process inspection confirmed `Rheo.exe` (PID 20644) successfully spawned child process `rheo-server.exe` (PID 7476).
  6. **Uninstallation:**
     - **Command:** `msiexec.exe /x "release\Rheo-v0.1.0-windows-x64.msi" /qn`
     - **Result:** Exit code `0`.
     - Desktop shortcut removed (`Test-Path` returned `False`).
     - Start Menu shortcut removed (`Test-Path` returned `False`).
     - Installed executables (`Rheo.exe`, `rheo-server.exe`, `rheo-mcp.exe`) removed.
     - User database (`%APPDATA%\sh.rheo.app\rheo.db`) strictly preserved.

---

## 4. MODEL STORAGE RECONCILIATION

The model directory configuration was traced end-to-end through frontend UI, Tauri IPC, environment variables, backend configuration, and Hugging Face Hub constants:

```
[Frontend: ModelManagement.tsx]
   │
   ▼ User sets custom model path
[Tauri IPC: restart_server(models_dir)]
   │
   ▼ Tauri sets env RHEO_MODELS_DIR=<path> on child process
[Backend: server.py / config.py]
   │
   ├─► _custom_models_dir = os.environ.get("RHEO_MODELS_DIR")
   ├─► os.environ["HF_HUB_CACHE"] = _custom_models_dir
   └─► hf_constants.HF_HUB_CACHE = _custom_models_dir
         │
         ▼
   Used by:
   - backend/backends/base.py (is_model_cached, repo_cache)
   - backend/backends/pytorch_backend.py (snapshot_download)
   - backend/services/model_verification.py (verify_model_cache)
   - backend/routes/models.py (/models/cache-dir, /models/migrate)
```

### Established Answers:
1. **Actual Default Model Path:**  
   When unconfigured, models default to `%USERPROFILE%\.cache\huggingface\hub`. User databases, profiles, and generations reside in `%APPDATA%\sh.rheo.app`.
2. **Custom Path Behavior:**  
   Selecting a custom folder in the UI dynamically passes `RHEO_MODELS_DIR` via Tauri when spawning the backend, overriding `HF_HUB_CACHE`.
3. **Do Model Manager and Backend Use the Same Path?**  
   **YES.** Both query `get_models_cache_dir()` and `hf_constants.HF_HUB_CACHE`.
4. **Does the Path Survive Updates & Reinstallation?**  
   **YES.** Neither `%APPDATA%\sh.rheo.app` nor `%USERPROFILE%\.cache\huggingface\hub` is removed or modified by NSIS or MSI updates.
5. **Does Offline Discovery Work?**  
   **YES.** `is_model_cached()` inspects local snapshot directories on disk. Tested with `HF_HUB_OFFLINE=1` in `test_offline_verification` with zero network requests.

---

## 5. CLEAN INSTALLATION EVIDENCE RECONCILIATION

Inspection of [`C:\Users\sivak\.gemini\antigravity\brain\...\scratch\run_clean_test_suite.py`](file:///C:/Users/sivak/.gemini/antigravity/brain/f02c8f03-07bd-4421-9648-daa27efa921d/scratch/run_clean_test_suite.py) reveals:

1. **Test Environment:**  
   The script does **NOT** run inside a virtual machine or Windows Sandbox. It executes directly on the Windows 11 host using a scrubbed environment dictionary:
   ```python
   CLEAN_ENV = {
       "PATH": r"C:\Windows\System32;C:\Windows;C:\Windows\System32\Wbem;C:\Windows\System32\WindowsPowerShell\v1.0",
       "SYSTEMROOT": r"C:\Windows",
       "APPDATA": r"C:\Users\sivak\AppData\Roaming",
       ...
   }
   ```
   All Python, Rust, Bun, Git, and developer paths were excluded from the spawned subprocess environment.
2. **Tool Absence:**  
   The spawned child binaries (`rheo-server.exe` and `rheo.exe`) executed strictly without developer tools on their `PATH`. However, the runner itself was executed by the Python test interpreter.
3. **Tested Artifacts:**  
   - NSIS was tested via actual installation to `C:\Program Files\Rheo`.
   - MSI was tested via administrative extraction (`msiexec /a`). *(Reconciled with true installation in Section 3 of this report).*
4. **Behavioral Assertions:**  
   The suite verified real runtime behaviors: HTTP `/health` responses, SQLite file creation, profile persistence across restart, offline boot, clean exit code on port conflict, and file deletion on uninstall.

---

## 6. HARDWARE VALIDATION BREAKDOWN

| Category | Component / Test | Status | Evidence / Notes |
| :--- | :--- | :---: | :--- |
| **Automated Tests** | Queue reliability, model distribution, task cancellation, storage | **PASS** | 100% automated using mocks; reproducible in <60 seconds. |
| **Physical Windows Tests** | Windows process creation, PID watchdog, pipe attachment, shortcuts | **PASS** | Verified on Windows 11 x86_64 host session. |
| **Audio Device Hardware** | WASAPI input capture & output playback | **NOT TESTED** | Automated test suite uses mocked audio arrays. Physical microphone capture was verified in GUI dev mode, but not in automated release gates. |
| **GPU Inference Hardware** | AMD ROCm / NVIDIA CUDA neural generation | **NOT TESTED** | `rocminfo` failed to detect AMD GPU on host; tests ran on CPU fallback. Real GPU inference with multi-gigabyte models was not executed per prompt rules. |

---

## 7. ARTIFACT INVENTORY & RECONCILIATION DISCREPANCY

All 8 binary and installer artifacts were independently audited using PowerShell `Get-FileHash` and `Get-AuthenticodeSignature`:

| Filename | Exact Path | Size (Bytes) | SHA-256 Checksum | Signature Status | Build Revision |
| :--- | :--- | :---: | :--- | :---: | :---: |
| **`Rheo-v0.1.0-windows-x64-setup.exe`** | `release\Rheo-v0.1.0-windows-x64-setup.exe` | 555,440,637 | `EF68850903E1975DC567B4AB92D67C128F65B56205F23D10CBDEE4CD3E021429` | `NotSigned` | Commit `f5c2555` |
| **`Rheo-v0.1.0-windows-x64.msi`** | `release\Rheo-v0.1.0-windows-x64.msi` | 556,445,696 | `C5E1EBEDD0D76BE74F2649002044593C0F949DD67B5F90C4F49A3909A14418FE` | `NotSigned` | Commit `f5c2555` |
| **`Rheo-v0.1.0-windows-x64.zip`** | `release\Rheo-v0.1.0-windows-x64.zip` | 2,200,366,814 | `D66A7F36CA02E7CEEE5D0E274A27CEB699C0A0A0F788BBF04718AD65D8FBE6A3` | `UnknownError` (ZIP) | Commit `f5c2555` |
| **`rheo-mcp.exe`** | `backend\dist\rheo-mcp.exe` | 21,449,914 | `EF0F209C7B8B8DDBD237149800582B0D7CC62B0FB41D25A320D6AF6A89C7C81F` | `NotSigned` | Built Nov 11, 2026 |
| **`rheo-server-rocm.exe`** | `backend\dist\rheo-server-rocm\rheo-server-rocm.exe` | 115,392,867 | `DC63710F8A90AEEEA9AC0B84B9A26949FAFD17B1039C9C338DD3A816CF7DB815` | `NotSigned` | Built Nov 11, 2026 |
| **`rheo-server-x86_64-pc-windows-msvc.exe`** | `tauri\src-tauri\binaries\rheo-server-x86_64-pc-windows-msvc.exe` | 530,975,105 | `EE2862B92050A914CDD5D485C3A338000B507A74435E5D4F3A30E808A7377938` | `NotSigned` | **Legacy (Sept 7, 2026)** |
| **`rheo-mcp-x86_64-pc-windows-msvc.exe`** | `tauri\src-tauri\binaries\rheo-mcp-x86_64-pc-windows-msvc.exe` | 21,449,914 | `EF0F209C7B8B8DDBD237149800582B0D7CC62B0FB41D25A320D6AF6A89C7C81F` | `NotSigned` | Matches `dist\rheo-mcp.exe` |
| **`rheo.exe`** | `tauri\src-tauri\target\release\rheo.exe` | 21,622,784 | `F4680FD60990978CCBCB34B75252383318F699B579555157FAFF9EA073A0E185` | `NotSigned` | Built Nov 11, 2026 |

### Critical Discrepancy Discovered:
- `backend/tests/test_packaged_binary.py` tests `backend/dist/rheo-server-rocm/rheo-server-rocm.exe` (a 5.79 GB onedir distribution built during Phase 6.3).
- **However**, Tauri's bundling configuration (`tauri.conf.json`) bundles single-file binaries from `tauri/src-tauri/binaries/`.
- `tauri/src-tauri/binaries/rheo-server-x86_64-pc-windows-msvc.exe` has timestamp **September 7, 2026** (size 530,975,105 bytes).
- When the installers were compiled in Phase 6.4, Tauri packaged this pre-existing single-file binary as the bundled CPU sidecar, rather than the freshly built `rheo-server-rocm`.
- **Impact:** While the bundled CPU binary launches and initializes the server and database, it lacks the Phase 6.3 `--version` pipe redirection fix and is an older build of the backend.
- **Required Action:** For final distribution, compile a fresh single-file CPU sidecar using `python build_binary.py --onefile --cpu` and copy it to `tauri/src-tauri/binaries/rheo-server-x86_64-pc-windows-msvc.exe` before triggering the final installer bundle.

---

## 8. CODE SIGNING AUDIT SUMMARY

1. **Minisign In-App Updater Signing:**
   - Public Key in `tauri.conf.json`: `RWSSNaW32qvc4bFqLfqUhrYvB7Ri2MvQqGc7T2l2uol7rddO2de9oZY7`.
   - Secret reference in CI: `secrets.TAURI_SIGNING_PRIVATE_KEY` present in `.github/workflows/release.yml`.
   - Staged Artifact: `release/latest.json` currently has `"signature": ""` because local builds were run with `--no-sign`.
2. **Windows Authenticode Signing:**
   - Authenticode signature audit: **100% of tested binaries and installers are `NotSigned`**.
   - CI Workflow Inspection: `.github/workflows/release.yml` contains Apple macOS code signing steps, but contains **zero** Windows Authenticode signing steps or secrets (`WINDOWS_CERTIFICATE`, `signtool.exe`).
   - Verdict: Windows Authenticode signing is **NOT YET IMPLEMENTED** in CI.

---

## 9. EXACT MISSING EVIDENCE CHECKLIST

Before promoting from **Controlled Beta** to **Public Release**, the following evidence must be generated:
- [ ] Fresh single-file CPU sidecar compiled and bundled into NSIS/MSI installers.
- [ ] Windows Authenticode signing step implemented in `.github/workflows/release.yml`.
- [ ] Signed test installer executed on Windows to verify SmartScreen pass-through without unknown-publisher warning.
- [ ] End-to-end installation test executed on a vanilla, pristine Windows 10/11 virtual machine.
- [ ] Manual end-to-end dictation audio capture test with physical USB microphone.
- [ ] Real GPU inference benchmark with multi-gigabyte voice model on physical NVIDIA/AMD hardware.
