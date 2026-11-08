# Rheo — Windows One-Click Installation & Operations Guide

> **Zero-Shot Voice Cloning, Multi-Engine Speech Synthesis, and Sovereign Audio Intelligence.**

This guide explains how to install, launch, update, and uninstall **Rheo** on Windows 10 and Windows 11 with zero developer setup, no Git, no Python knowledge, and no command-line requirements.

---

## ⚡ Quick Start: 1-Click Install

### Step 1: Download the Installer
Download [`install.bat`](install.bat) directly to your Windows computer (e.g., your **Downloads** folder or Desktop).

### Step 2: Double-Click to Install
Double-click `install.bat`. That's it!

The automated installer will:
1. **Audit Environment**: Confirms 64-bit Windows architecture and checks for at least 2.5 GB free disk space.
2. **Download Release**: Retrieves the latest production release package from GitHub over HTTPS.
3. **Verify Integrity**: Validates the SHA-256 cryptographic checksum against tampering or corruption.
4. **Deploy Application**: Extracts the production binaries into `%LOCALAPPDATA%\Programs\Rheo`.
5. **Configure Environment**: Initializes default ports (17493 / 14000), logging, and local storage.
6. **Register Shortcuts**: Generates desktop and Start Menu shortcuts with the official Rheo icon.
7. **Launch Rheo**: Automatically starts the application so it is immediately ready for use.

---

## 📋 System Requirements

| Specification | Minimum Requirement | Recommended |
| :--- | :--- | :--- |
| **Operating System** | Windows 10 (Build 17763+) or Windows 11 | Windows 11 (64-bit) |
| **Architecture** | 64-bit (x64 / AMD64) | 64-bit (x64 / AMD64) |
| **Storage** | 2.5 GB available storage | 10 GB+ (for local voice models) |
| **Memory (RAM)** | 8 GB RAM | 16 GB+ RAM |
| **GPU (Optional)** | CPU execution supported | NVIDIA GPU (CUDA 12+) or AMD (ROCm) |
| **Permissions** | Standard user (No Administrator required) | Standard user |

> [!NOTE]
> Rheo installs cleanly in your user space (`%LOCALAPPDATA%\Programs\Rheo`). You **never** need administrator privileges or UAC elevation to install or run Rheo.

---

## 🚀 Application Management

### Launching Rheo
- **Desktop Shortcut**: Double-click the **Rheo** icon on your Desktop.
- **Start Menu**: Search for **Rheo** in the Windows Start Menu.
- **Direct Script**: Double-click `launch.bat` inside `%LOCALAPPDATA%\Programs\Rheo`.

### Updating Rheo
Rheo includes an automated updater that preserves your voice profiles and cloned models:

1. Double-click `update.bat` in `%LOCALAPPDATA%\Programs\Rheo` or the repository folder.
2. The updater queries the GitHub Release API, compares your local version against the latest release, and downloads only the necessary update package.
3. Your previous version is automatically backed up before applying updates. If an update fails, the installer automatically rolls back to your working version.

### Uninstalling Rheo
To cleanly remove Rheo from your computer:

1. Double-click `uninstall.bat` in `%LOCALAPPDATA%\Programs\Rheo`.
2. The uninstaller safely closes running Rheo services, removes Start Menu and Desktop shortcuts, and deletes application files.
3. **Data Preservation Prompt**: The uninstaller explicitly asks if you want to keep your voice models and SQLite database:
   ```text
   Do you want to PRESERVE your local voice clones and history? (Y/N, default Y)
   ```
   - Press **Y** (or Enter) to retain all voice clones and history for future reinstalls.
   - Press **N** to completely purge all data from `%LOCALAPPDATA%\Rheo`.

---

## 📂 File and Directory Layout

Rheo follows modern Windows application standards:

```text
%LOCALAPPDATA%\Programs\Rheo\          <-- Application binaries & runtime
├── Rheo.exe                           <-- Main Tauri desktop application
├── binaries\                          <-- High-performance sidecars
│   ├── rheo-server-x86_64-pc-windows-msvc.exe
│   └── rheo-mcp-x86_64-pc-windows-msvc.exe
├── icon.ico                           <-- App icon
├── launch.bat                         <-- Launch script
├── update.bat                         <-- Safe update mechanism
├── uninstall.bat                      <-- Clean uninstallation
├── version.txt                        <-- Installed version stamp
└── installer\                         <-- Embedded installer engine
    ├── installer.ps1
    └── config.ini

%LOCALAPPDATA%\Rheo\                   <-- User data & persistent configuration
├── config\
│   └── config.json                    <-- Runtime configuration (port, device)
├── data\                              <-- Cloned voices, audio recordings, SQLite WAL database
│   └── rheo.db                        <-- SQLite database
└── logs\                              <-- Diagnostics and installer logs
    └── installer.log                  <-- Detailed operation logs
```

---

## 🔒 Security Architecture

1. **Strict Transport Security**: All downloads strictly utilize TLS 1.2+ over HTTPS from official GitHub endpoints.
2. **Checksum Verification**: Archives are verified with SHA-256 before extraction.
3. **Path Traversal Guard**: Archive extraction includes anti-zip-slip checks ensuring files cannot write outside `%LOCALAPPDATA%\Programs\Rheo`.
4. **Least Privilege**: Runs entirely in user-space (`%LOCALAPPDATA%`), eliminating security risks associated with unnecessary administrator privileges.
5. **No Bundled Credentials**: No secrets or API keys are stored in the installer or codebase.

---

## 🔧 Troubleshooting & FAQ

### 1. Windows SmartScreen Warning
- **Cause**: New executables downloaded from GitHub without an EV code-signing certificate may trigger Windows Defender SmartScreen.
- **Solution**: Click **"More info"** and then **"Run anyway"**.

### 2. "Insufficient disk space" Error
- **Cause**: Your primary Windows drive has less than 2.5 GB free space.
- **Solution**: Free up disk space on drive `C:` and rerun `install.bat`.

### 3. Port Conflict (Port 17493 / 14000 already in use)
- **Cause**: Another service or an existing Rheo instance is already running.
- **Solution**: Check Task Manager and terminate any orphaned `Rheo.exe` or `rheo-server` processes, or change the default port in `%LOCALAPPDATA%\Rheo\config\config.json`.

### 4. Viewing Installation Logs
Detailed diagnostic logs are saved automatically to:
```cmd
%LOCALAPPDATA%\Rheo\logs\installer.log
```
If you encounter any issues, attach this file when opening a GitHub Issue.

---

## 📦 For Maintainers: Publishing New Releases

To package and publish a new Windows release:

1. Build the Tauri desktop app and PyInstaller sidecars:
   ```cmd
   bun run build
   ```
2. Run the automated release packager:
   ```cmd
   scripts\package-windows-release.bat
   ```
3. The packager automatically creates:
   - `release\Rheo-windows-x64.zip`
   - `release\Rheo-windows-x64.zip.sha256`
   - `release\Rheo-v<version>-windows-x64-setup.exe` (NSIS installer)
   - `release\Rheo-v<version>-windows-x64.msi` (MSI package)
4. Upload all files from the `release\` directory to the corresponding GitHub Release.
