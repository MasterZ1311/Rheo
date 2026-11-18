# RHEO 0.1.0 — PRIVATE BETA DISTRIBUTION CHECKLIST

**Application:** Rheo  
**Target Version:** 0.1.0  
**Target Architecture:** Windows 10/11 x86_64  
**Release Branch:** `MZ-Main`  
**Commit Hash:** `cc4ebdcc02a6ae10374db1757d600eabe8cd037c`  
**Release Manager:** Senior Windows Release Engineer  
**Distribution Channel:** Controlled Private Beta (Small invite-only group)  
**Distribution State:** **STAGED LOCALLY — NOT PUBLISHED**

---

## 1. Verified Release Artifact Manifest

The release artifacts below have been independently verified, cryptographically hashed, and confirmed immutable:

| Artifact Type | Filename | Exact Byte Size | Cryptographic SHA-256 Checksum | Signature Status |
| :--- | :--- | :---: | :--- | :---: |
| **Enterprise Installer** | `Rheo_0.1.0_x64_en-US.msi` | 1,253,617,664 B | `F6B982768F8C78EC77B38BB1C2BC73A82B3777E061AEAB9B632F025B1814B33C` | `NotSigned` |
| **Setup Executable** | `Rheo_0.1.0_x64-setup.exe` | 1,260,000,724 B | `5ADFA9420D56B21D1789DDEB0CD836BD7EFC75E0C5CE7007784E06CD5AC4BEDE` | `NotSigned` |
| **Checksum Manifest** | `Rheo_0.1.0_SHA256SUMS.txt` | 170 B | SHA-256 distribution verification file | N/A |

### 1.1 Local Storage Paths
* **MSI:** `E:\Github\VoiceBox\tauri\src-tauri\target\release\bundle\msi\Rheo_0.1.0_x64_en-US.msi`
* **NSIS:** `E:\Github\VoiceBox\tauri\src-tauri\target\release\bundle\nsis\Rheo_0.1.0_x64-setup.exe`
* **Checksums:** `E:\Github\VoiceBox\tauri\src-tauri\target\release\bundle\Rheo_0.1.0_SHA256SUMS.txt`

---

## 2. Beta Distribution Readiness Checklist

### Phase A: Artifact Integrity & Safety Controls
- [x] **Artifact Immutability:** Confirm installers are byte-for-byte identical to Phase 6.7D/6.7E qualified builds.
- [x] **Model Weights Excluded:** Installer bundles contain 0 model checkpoint files (`.pt`, `.safetensors`, `.bin`, `.onnx`).
- [x] **Checksum Manifest Verified:** `Rheo_0.1.0_SHA256SUMS.txt` accurately validates both MSI and NSIS packages.
- [x] **Clean Uninstall Verified:** Uninstallation removes binaries while strictly preserving `%APPDATA%\sh.rheo.app` and `%LOCALAPPDATA%\sh.rheo.app\models`.
- [x] **Offline Operation Verified:** Downloaded models function without Internet connectivity.

### Phase B: Tester Documentation Pack
- [x] **Testing Guide Prepared:** [BETA_TESTING_GUIDE.md](file:///e:/Github/VoiceBox/BETA_TESTING_GUIDE.md) covers installation, SmartScreen bypass, first-launch delay, and troubleshooting.
- [x] **Feedback Template Prepared:** [BETA_FEEDBACK_TEMPLATE.md](file:///e:/Github/VoiceBox/BETA_FEEDBACK_TEMPLATE.md) provides structured reporting with strict privacy notices.
- [x] **Release Engineering Report:** [PHASE_6_7E_BETA_QUALIFICATION_REPORT.md](file:///e:/Github/VoiceBox/PHASE_6_7E_BETA_QUALIFICATION_REPORT.md) records technical qualification evidence.

### Phase C: Distribution Safeguards
- [x] **No Public GitHub Release:** GitHub Releases are NOT published.
- [x] **No Git Tag Pushed:** Git tags (`v0.1.0`) are NOT pushed to external remotes.
- [x] **No Public Asset Uploads:** Installers are NOT uploaded to public CDNs or release assets.
- [x] **Direct Distribution Protocol:** Installers and guides are to be shared directly via secure private link or storage bucket with selected testers.

---

## 3. Beta Issue Classification & SLA Matrix

Incoming beta issues reported via `BETA_FEEDBACK_TEMPLATE.md` must be triaged according to the following severity matrix:

| Severity | Category | Definition & Criteria | Target Response / Action |
| :---: | :--- | :--- | :--- |
| **P0** | **Blocker** | • Data loss or database corruption.<br>• Security vulnerability or unauthenticated remote access.<br>• Application fails to start or crashes immediately on launch. | Immediate stop-ship; patch release candidate within 24 hours. |
| **P1** | **Critical** | • Core voice generation fails completely.<br>• Model downloader fails for all models.<br>• Audio device deadlock or unrecoverable error. | Fix within 48 hours; release updated beta build. |
| **P2** | **Major** | • Audio stuttering / buffer underruns during playback.<br>• Model migration failure.<br>• Significant memory leak during long generation sessions. | Prioritize for next scheduled beta refresh. |
| **P3** | **Minor** | • Cosmetic UI glitches, text clipping, or CSS alignment bugs.<br>• Sub-optimal progress bar smoothing.<br>• Minor localization or typo issues. | Queue for General Availability (GA) polish pass. |
| **P4** | **Feature Request** | • Requests for new TTS engines, cloud integrations, or additional shortcuts.<br>• System tray minimization / toast notification requests. | Triage into product backlog for v0.2.0+. |

---

## 4. Diagnostics & Privacy Policy

Beta testers must be instructed on how to retrieve logs without leaking personal data:
1. **Never request tester database files (`rheo.db`) or custom audio samples:** These contain user voice clones and private generation text.
2. **Standard Diagnostic Paths:**
   - App Data: `%APPDATA%\sh.rheo.app`
   - Model Cache: `%LOCALAPPDATA%\sh.rheo.app\models`
   - Temporary Extraction: `%TEMP%\_MEI*`
3. **Log Sanitization:** Ensure all shared command output or error traces have personal usernames (`C:\Users\<username>`) and tokens scrubbed.

---

## 5. Sign-off

* **Release Qualification:** **PASS (READY FOR PRIVATE BETA)**
* **Distribution Authorization:** **PENDING USER AUTHORIZATION**
* **Network Actions Taken:** **NONE (Safeguards Active)**
