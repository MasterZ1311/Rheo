# RHEO PHASE 6.7D — FINAL RELEASE CANDIDATE VERIFICATION REPORT

**Date:** 2026-11-11  
**Target Platform:** Windows 10/11 x86_64  
**Application Version:** 0.1.0  
**Git Branch:** `MZ-Main`  
**Git Commit Hash:** `f5c2555b521aa5f392d5041df8280c63d412a0a9`  
**Auditor:** Senior Windows Desktop Release Auditor & QA Engineer  

---

## 1. Executive Summary & Verdict

An independent, end-to-end verification of Rheo version 0.1.0 was performed across build artifacts, installer lifecycles, backend independence, model management, security configurations, automated test suites, and physical bare-metal hardware execution.

### Final Verdict: **B. READY FOR CONTROLLED BETA**

**Rationale:**
1. **Core Functionality Verified (100%):** Both MSI and NSIS installers build, deploy, execute, and cleanly uninstall. The backend runs completely independently of developer tooling (Python, Git, Rust, Node, Bun). Voice cloning, profile management, model distribution, Whisper transcription (0.0% WER on CPU), and Kokoro TTS speech synthesis (4.01x RTF on CPU) operate reliably on physical Windows 11 hardware.
2. **Data & Model Safety Verified (100%):** Models are completely excluded from installer packages and downloaded post-install. User databases (`%APPDATA%\sh.rheo.app`) and cached weights (`%LOCALAPPDATA%\sh.rheo.app\models`) strictly survive both application upgrades and uninstallation passes.
3. **Automated Verification Passed:** All 119 automated tests (80 distribution/security/integrity tests, 33 functional E2E tests, 5 packaged binary lifecycle tests, and 1 native Rust hardware test) pass cleanly.
4. **Controlled Beta Designation Justification:** The release binaries are not signed with a Windows Authenticode digital certificate (`Status: NotSigned`), which causes Microsoft Defender SmartScreen to display an "Unknown Publisher" protection prompt during initial installation. Additionally, system tray minimization and Windows toast notifications are confirmed feature gaps not yet implemented in version 0.1.0. A controlled beta release is the appropriate classification until an Authenticode certificate is provisioned and integrated into the CI/CD pipeline.

---

## 2. Release Artifact Identity & Integrity

| Property | WiX MSI Installer | NSIS Setup Executable |
| :--- | :--- | :--- |
| **Filename** | `Rheo_0.1.0_x64_en-US.msi` | `Rheo_0.1.0_x64-setup.exe` |
| **Full Path** | `E:\Github\VoiceBox\tauri\src-tauri\target\release\bundle\msi\Rheo_0.1.0_x64_en-US.msi` | `E:\Github\VoiceBox\tauri\src-tauri\target\release\bundle\nsis\Rheo_0.1.0_x64-setup.exe` |
| **File Size (Bytes)** | 556,445,696 bytes | 555,440,637 bytes |
| **File Size (MB)** | 530.67 MB | 529.71 MB |
| **SHA-256 Hash** | `C5E1EBEDD0D76BE74F2649002044593C0F949DD67B5F90C4F49A3909A14418FE` | `EF68850903E1975DC567B4AB92D67C128F65B56205F23D10CBDEE4CD3E021429` |
| **Target Architecture** | Windows x86_64 | Windows x86_64 |
| **Target Product Version** | 0.1.0 | 0.1.0 |
| **Authenticode Status** | `NotSigned` | `NotSigned` |
| **Tauri Updater Support** | Configured (`Minisign`) | Configured (`Minisign`) |

---

## 3. Master Verification Matrix

| # | Requirement | Verified Evidence & Findings | Result | Severity | Remaining Action |
| :---: | :--- | :--- | :---: | :---: | :--- |
| **1** | Both MSI and NSIS artifacts exist | MSI (530.67 MB) and NSIS (529.71 MB) exist under `tauri/src-tauri/target/release/bundle/`. Full SHA-256 hashes generated and cataloged. | **PASS** | None | None. Ready for distribution. |
| **2** | Both installers install and launch Rheo | Tested both silent installations (`msiexec /i ... /qn` and `...-setup.exe /S`). Binaries staged into `C:\Program Files\Rheo\`; `Rheo.exe` launches and supervises `rheo-server.exe`. | **PASS** | None | None. |
| **3** | Backend works without developer tools | Installed `rheo-server.exe` was launched in an isolated environment with `PATH="C:\Windows\System32;C:\Windows"`. Process started, migrated DB, served `/health` in 44.1ms, and shut down cleanly. | **PASS** | None | None. |
| **4** | Models are separate downloads | Installer payloads audited: zero weights (`.pt`, `.safetensors`, `.bin`, `.onnx`) packaged. Models downloaded on demand via Hugging Face Hub into `%LOCALAPPDATA%\sh.rheo.app\models`. | **PASS** | None | None. |
| **5** | Model integrity checks work | Model verification service (`model_verification.py`) computes SHA-256 and validates tree structure. Corrupted or missing weights trigger error states before inference. | **PASS** | None | None. |
| **6** | Offline model usage works | Models operate in `local_files_only=True` mode when cached. Physical audio synthesis and transcription verified on CPU without active Internet connection. | **PASS** | None | None. |
| **7** | Custom model directory works | `RHEO_MODELS_DIR` environment variable and `model_dir` settings configuration allow redirecting cache to secondary drives. Path resolution validated. | **PASS** | None | None. |
| **8** | Application upgrades preserve data and models | MajorUpgrade test from 0.1.0 to 0.5.0 verified. SQLite database (`%APPDATA%\sh.rheo.app\rheo.db`) and model cache (`%LOCALAPPDATA%\sh.rheo.app\models`) remained 100% intact. | **PASS** | None | None. |
| **9** | Uninstallation safely preserves data by default | Uninstallation via `msiexec /x /qn` and `Uninstall.exe /S` cleanly removes Program Files binaries but preserves user databases, logs, profiles, and downloaded models. | **PASS** | None | None. |
| **10** | Security controls remain intact | CORS locked to localhost/Tauri schemes; Zip-Slip and path traversal protections active; API keys encrypted in Windows Credential Locker; strict Tauri CSP configured. | **PASS** | None | None. |
| **11** | All required automated tests pass | 119 automated tests executed and passing across 6 test suites (80 backend distribution/security/data integrity, 33 E2E functional, 5 packaged binary, 1 native Rust hardware). | **PASS** | None | None. |
| **12** | Hardware validation status accurately represented | Physical hardware QA executed on 11th Gen Intel Core i5 with WASAPI audio. 9 hardware tests passed, 3 feature/hardware gaps honestly marked `BLOCKED`. | **PASS** | Low | Document feature gaps in release notes. |
| **13** | Updater signing is correctly configured | `tauri.conf.json` contains valid Minisign public key; `.github/workflows/release.yml` wires `TAURI_SIGNING_PRIVATE_KEY` for CI releases. | **PASS** | None | Ensure GitHub secret `TAURI_SIGNING_PRIVATE_KEY` is maintained. |
| **14** | Authenticode status is accurately represented | Windows binaries and installers are `NotSigned`. SmartScreen alert expected. Accurately documented in Windows release guide. | **PASS** | Medium | Procure and configure Windows EV/OV Authenticode certificate for GA. |
| **15** | Documentation matches actual behavior | `docs/WINDOWS_RELEASE_GUIDE.md` thoroughly documents silent install switches, SmartScreen workaround, system requirements, and model cache paths. | **PASS** | None | None. |

---

## 4. Test Suite Execution Summary

All test suites were executed directly against the current repository state and build outputs:

| Test Suite File | Domain / Focus Area | Tests Executed | Passed | Failed | Duration |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `backend/tests/test_model_distribution.py` | Model Registry, Downloads, Caches, Integrity | 16 | 16 | 0 | 9.03s |
| `backend/tests/test_data_integrity.py` | SQLite Migrations, Cascade Deletion, Backups | 17 | 17 | 0 | 4.81s |
| `backend/tests/test_generation_reliability.py` | Task Queue, Deduplication, Workers, Concurrency | 18 | 18 | 0 | 5.22s |
| `backend/tests/test_security_audit.py` | Auth, CORS, Path Traversal, Credential Keyring | 29 | 29 | 0 | 7.14s |
| `backend/tests/test_functional_e2e.py` | End-to-End API Workflows, Profiles, Audio | 33 | 33 | 0 | 20.17s |
| `backend/tests/test_packaged_binary.py` | Packaged PyInstaller Binary Lifecycle & Flags | 5 | 5 | 0 | 58.56s |
| `tauri/src-tauri/tests/physical_hardware_qa.rs` | Native Windows WASAPI & Win32 Integration | 1 | 1 | 0 | 9.00s |
| **Total Test Suite** | **Comprehensive Regression & Release Suite** | **119** | **119** | **0** | **~114s** |

---

## 5. Physical Hardware QA Status Reconciliation

Physical testing was performed on a bare-metal Windows 11 Pro host (11th Gen Intel Core i5-1155G7, 32 GB RAM, Cirrus Logic HD Audio, Intel Iris Xe Graphics).

* **Operational Audio Pipeline (PASS):** Real-time WASAPI capture on `Digital Microphone` (48 kHz, 2ch, 240,000 samples), real-time RMS/peak metering, dynamic device switching to `Speakers` and `PM161Q B1` external display audio without audio glitches.
* **CPU Machine Learning Pipeline (PASS):** Whisper ASR transcribed LJSpeech audio with **0.0% Word Error Rate** (16/16 words correct); Kokoro TTS synthesized 24 kHz speech on CPU with an RTF of 4.01x.
* **Background Daemon (PASS):** Installed `rheo-server.exe` started headlessly on custom port, served API requests with 44.1 ms latency, and gracefully terminated on `POST /shutdown`.
* **Hardware & Feature Boundaries (BLOCKED):**
  - Discrete GPU generation is marked `BLOCKED` (machine has integrated Intel Iris Xe graphics; fallback to CPU handled cleanly).
  - System Tray minimize/restore is marked `BLOCKED` (feature not present in Rheo 0.1.0 codebase).
  - Windows Toast Notifications are marked `BLOCKED` (feature not present in Rheo 0.1.0 codebase).
  - Background process keystroke insertion (`SendInput`) is marked `PASS*` with Windows User Interface Privilege Isolation (UIPI) security boundary documented.

---

## 6. Known Limitations for Controlled Beta

1. **Microsoft Defender SmartScreen Prompt:** Because the installers are unsigned (`NotSigned`), users downloading via browser will encounter the standard Windows SmartScreen *"Windows protected your PC"* alert. Users must click **More info** → **Run anyway** to proceed.
2. **CPU Inference Latency on Integrated Graphics:** On systems without discrete NVIDIA CUDA or AMD ROCm GPUs, Kokoro TTS operates on CPU at ~4.0x RTF (~17.8s per sentence) and Whisper Tiny operates at ~33s per transcription. Users should be advised of expected CPU generation times.
3. **Absence of System Tray / Toast Alerts:** Rheo 0.1.0 operates as a standard desktop window and does not minimize to the taskbar notification area or trigger Windows Action Center toasts.
4. **First-Launch Initialization Time:** First launch of `rheo-server.exe` requires 30–45 seconds while PyInstaller unpacks internal binary bundles and SQLite applies migrations. Subsequent launches execute faster (~3–5 seconds).

---

## 7. Sign-off and Publication Safeguard

* **Publication Status:** **HOLD.** In accordance with release protocol, no GitHub releases have been created, no Git tags have been pushed, and no code has been published to external remotes.
* **Release Artifacts:** Staged locally under `tauri/src-tauri/target/release/bundle/` ready for controlled distribution upon user authorization.

**Phase 6.7D Release Candidate Verification: COMPLETE**
