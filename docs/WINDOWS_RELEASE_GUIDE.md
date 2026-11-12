# RHEO WINDOWS USER & ADMINISTRATOR GUIDE

**Application Version:** 0.1.0  
**Target OS:** Microsoft Windows 10 / 11 (64-bit x86_64)  
**Package Formats:** NSIS (`.exe`) and WiX Windows Installer (`.msi`)

---

## 1. System Requirements

### 1.1 Minimum Hardware Specifications (CPU Mode)
- **Operating System:** Windows 10 (Version 1903 or higher, 64-bit) or Windows 11
- **Processor (CPU):** Intel Core i5 (8th Gen+) or AMD Ryzen 3 (2000 Series+) with AVX2 instruction support
- **Memory (RAM):** 8 GB RAM (16 GB strongly recommended for neural voice cloning)
- **Disk Space:**
  - 1.5 GB free disk space for base application and runtime binaries
  - 5 to 15 GB additional disk space recommended for downloaded speech/transcription model caches
- **Display:** 1280 x 800 minimum resolution

### 1.2 GPU Acceleration Requirements (Optional High-Performance Mode)
Rheo operates out-of-the-box using CPU synthesis. Hardware acceleration can be activated by installing a GPU backend pack:
- **AMD ROCm 7.2 Acceleration:**
  - Compatible GPUs: AMD Radeon RX 7000 Series (RDNA 3, e.g. RX 7900 XTX, 7800 XT), RX 9000 Series (RDNA 4), or Radeon Pro W7000 series with 8 GB+ VRAM.
  - Runtime: Bundled ROCm HIP runtime kernels (tested on ROCm 7.2.1).
- **NVIDIA CUDA 12.8 Acceleration:**
  - Compatible GPUs: NVIDIA GeForce RTX 20/30/40/50 Series (Ampere, Ada Lovelace, Blackwell) with compute capability 8.0+ and 6 GB+ VRAM.
  - Driver: NVIDIA Game Ready / Studio Driver version 550.00 or higher.
- **Intel Arc / Xe:** Operates in CPU or DirectML compatibility mode.

---

## 2. Installation Guide

### 2.1 Standard Setup (NSIS `.exe`)
The recommended installer for individual users and creators:
1. Download `Rheo-v0.1.0-windows-x64-setup.exe` from the official release page.
2. Double-click the installer. If prompted by Windows SmartScreen, click **More info** → **Run anyway**.
3. Choose installation scope:
   - **Only for me (Current User):** Installs to `%LOCALAPPDATA%\Programs\Rheo` without requiring Administrator elevation.
   - **Anyone who uses this computer (All Users):** Installs to `C:\Program Files\Rheo` (requires Administrator UAC approval).
4. Select destination directory (default is pre-filled).
5. Click **Install**. A desktop shortcut and Start Menu folder will be created.

#### Silent / Automated Installation:
```powershell
# Silent install (Per-machine)
.\Rheo-v0.1.0-windows-x64-setup.exe /S

# Silent install (Current user, no admin required)
.\Rheo-v0.1.0-windows-x64-setup.exe /S /CurrentUser
```

### 2.2 Enterprise Deployment (WiX `.msi`)
The recommended installer for system administrators, corporate networks, and Group Policy (GPO):
1. Download `Rheo-v0.1.0-windows-x64.msi`.
2. Double-click to install via Windows Installer UI, or deploy silently:
```powershell
# Option A: System-wide install for All Users (Run from Administrator PowerShell)
msiexec.exe /i Rheo-v0.1.0-windows-x64.msi /qn /l*v install.log

# Option B: Per-User install (Standard user token, no UAC elevation required)
msiexec.exe /i Rheo-v0.1.0-windows-x64.msi MSIINSTALLPERUSER=1 ALLUSERS=2 /qn /l*v install.log

# Option C: Administrative network extraction (unpack payload without registering)
msiexec.exe /a Rheo-v0.1.0-windows-x64.msi /qn TARGETDIR=C:\RheoUnpacked
```

---

## 3. First-Launch Guide

1. Launch **Rheo** from the desktop shortcut or Start Menu.
2. On first launch, the desktop host (`Rheo.exe`) automatically boots the background Python speech engine (`rheo-server.exe`) on port `17493`.
3. **Windows Defender Firewall Alert:** If prompted to allow network communication, click **Allow access**. Rheo only binds locally to `127.0.0.1` by default and does not accept incoming connections from the local network unless `--host 0.0.0.0` is explicitly configured.
4. Database initialization occurs automatically: SQLite creates `%APPDATA%\sh.rheo.app\rheo.db` and applies initial schema migrations.
5. The application UI will open to the **Dashboard**.

---

## 4. Model Download Guide

Rheo does **not** bundle heavy AI models in the installer so that downloads remain lean and agile:
1. Navigate to **Models** in the left sidebar navigation.
2. You will see an inventory of supported models across categories:
   - **Text-to-Speech:** Piper (Fast CPU), Kokoro 82M (Expressive), Qwen2-Audio / Qwen-TTS, Chatterbox Multilingual, LuxTTS, HumeAI TADA.
   - **Transcription / Dictation:** Whisper Tiny, Base, Small, Medium, Large-v3-Turbo.
3. Click **Download** on your desired model (e.g. `Kokoro-82M` or `Piper-en_US-lessac`).
4. A real-time progress card displays download speed (MB/s), elapsed time, downloaded megabytes, and Estimated Time to Completion (ETA).
5. Before downloading, Rheo verifies available disk space. If insufficient space is available, it warns you before consuming bandwidth.
6. Once downloaded, the model undergoes automatic SHA-256 integrity verification.

---

## 5. Offline Usage Guide

Rheo is architected as a **100% sovereign, local-first application**:
- **Offline Operations:**
  - Neural text-to-speech generation with downloaded models.
  - Voice cloning using reference audio samples.
  - Microphone dictation and Whisper transcription.
  - Voice profile creation, audio effects, and stories composition.
  - Audio export to WAV and history playback.
- **Online-Only Features:**
  - Initial model weight downloads from Hugging Face.
  - In-app automatic update checks.
  - Third-party cloud TTS engines (OpenAI, ElevenLabs, Cartesia) if configured with custom API keys.

---

## 6. Model Storage Configuration Guide

By default, downloaded model checkpoints are stored in `%USERPROFILE%\.cache\huggingface\hub` or `%APPDATA%\sh.rheo.app\models`.

### Changing Model Storage Location:
If your `C:` drive has limited capacity, you can redirect the model cache to another drive (e.g. `D:\AI_Models`):
1. In Rheo, click **Settings** → **Model Storage**.
2. Click **Browse** and select a folder on any local hard drive or SSD (paths with spaces are supported).
3. Click **Apply Storage Location**.
4. Alternatively, set the system environment variable:
```powershell
[System.Environment]::SetEnvironmentVariable("RHEO_MODELS_DIR", "D:\RheoModels", "User")
```
Downloaded models will persist across application updates in this location.

---

## 7. Backup and Restore Guide

Rheo automatically protects your creative assets:
- **Automatic Daily Snapshots:**
  Rheo creates daily backups of `%APPDATA%\sh.rheo.app\rheo.db` in `%APPDATA%\sh.rheo.app\backups\`, keeping the last 7 daily snapshots.
- **Manual Backup:**
  To back up your complete studio setup:
  1. Close Rheo.
  2. Copy the folder `%APPDATA%\sh.rheo.app\` to an external drive or cloud storage. This directory contains your database, custom voice clones, and generation history.
- **Restoring from Backup:**
  1. Ensure Rheo is closed.
  2. Paste your backed-up `sh.rheo.app` directory into `%APPDATA%\`.
  3. Re-launch Rheo; your voice profiles and generations will be restored immediately.

---

## 8. Update Guide

Rheo features a cryptographic in-app updater:
1. When a new release is published, a banner appears in the top navigation: **"Update Available: vX.Y.Z"**.
2. Click **View Release Notes** to review improvements and bug fixes.
3. Click **Update Now**. Rheo downloads the update package, verifies its Minisign cryptographic signature, installs the updated binaries, and restarts seamlessly.
4. **Data Guarantee:** Updates overwrite only the program executables. Your database, audio recordings, custom voices, and downloaded models are **never touched or reset** during an update.

---

## 9. Uninstallation & Data-Retention Guide

### Standard Uninstallation:
1. Open Windows **Settings** → **Installed Apps** (or Control Panel → Programs and Features).
2. Locate **Rheo**, click the menu, and select **Uninstall**.
3. The uninstaller removes all program binaries from `C:\Program Files\Rheo` or `%LOCALAPPDATA%\Programs\Rheo`.
4. **Data Retention Policy:** By default, your user data in `%APPDATA%\sh.rheo.app` and downloaded model weights are **strictly preserved** so you do not lose custom voice models if you reinstall later.
5. **Full Wipe Option:** If you wish to permanently delete all data, check the **"Delete app data"** checkbox in the uninstaller confirmation dialog.

---

## 10. Troubleshooting & FAQ

### Issue: "Port 17493 in use" or Server Fails to Start
- **Cause:** A previous Rheo process or another local developer service is listening on port 17493.
- **Solution:** Rheo's process supervisor automatically attempts to terminate orphaned Rheo instances. If an external application is using the port, you can customize the port by starting Rheo from a terminal:
```powershell
& "C:\Program Files\Rheo\rheo.exe" -- --port 18493
```

### Issue: Microsoft Defender SmartScreen "Windows protected your PC"
- **Cause:** Pre-release and Beta release candidate installers are cryptographically signed with Minisign for in-app updates, but may not yet carry a commercial Authenticode EV/OV certificate.
- **Solution:** Click **More info** on the SmartScreen dialog, then click **Run anyway**. You can independently verify the cryptographic integrity of any installer artifact using PowerShell:
```powershell
Get-FileHash -Path .\Rheo-v0.1.0-windows-x64-setup.exe -Algorithm SHA256
```
Compare the resulting hash against `Rheo-v0.1.0-windows-x64-setup.exe.sha256` published with the release.

### Issue: "Missing VCRUNTIME140.dll"
- **Cause:** Target machine is missing the Microsoft Visual C++ Redistributable.
- **Solution:** Download and install the free [Microsoft Visual C++ 2015-2022 Redistributable (x64)](https://aka.ms/vs/17/release/vc_redist.x64.exe).

### Issue: Slow Speech Synthesis on First Run
- **Cause:** When a model is loaded into memory for the very first time, PyTorch initializes CPU kernels or compiles GPU pipelines.
- **Solution:** Subsequent generation runs take advantage of cached in-memory models and generate speech in real-time.
