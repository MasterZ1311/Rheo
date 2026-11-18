# RHEO 0.1.0 — PRIVATE BETA TESTING GUIDE

**Welcome to the Rheo Private Beta!**  
Rheo is a local-first AI voice studio and conversational dictation system for Windows. It lets you clone voices, synthesize natural speech, transcribe audio, and integrate with AI tools—all running 100% locally on your machine without mandatory cloud subscriptions or telemetry.

---

## 1. Important Notice Before You Begin

> [!WARNING]
> **Microsoft Defender SmartScreen Warning (Unsigned Beta)**  
> Because this is a private beta build, the installers are **not digitally signed with an Authenticode certificate**. When you run the installer, Windows SmartScreen will display an alert:  
> *"Windows protected your PC — Microsoft Defender SmartScreen prevented an unrecognized app from starting."*  
> **How to proceed:** Click **More info**, then click **Run anyway**.

> [!IMPORTANT]
> **First-Launch Initialization Time (30–45 Seconds)**  
> On your very first launch, Rheo's local AI runtime extracts and initializes its internal libraries (PyTorch, audio DSP, and phonemizer databases). **This process takes approximately 30 to 45 seconds.**  
> During this window, the application may appear idle or display a white/loading window. **Do not close or terminate the application.** Subsequent launches will open in approximately **3 to 4 seconds**.

---

## 2. System Requirements

### 2.1 Minimum Hardware Specifications (CPU Mode)
* **Operating System:** Windows 10 (64-bit, Version 1903 or higher) or Windows 11.
* **Processor (CPU):** Intel Core i5 (8th Gen+) or AMD Ryzen 3 (2000 Series+) with AVX2 instruction support.
* **System Memory (RAM):** 8 GB minimum (16 GB or 32 GB strongly recommended).
* **Available Storage:**
  * **Application:** 1.5 GB free disk space for base installation and runtime.
  * **AI Models:** 5 GB to 15 GB free disk space recommended for downloaded speech and transcription models.
* **Display:** 1280 x 800 minimum screen resolution.

### 2.2 Optional GPU Acceleration
* **NVIDIA CUDA:** GeForce RTX 20/30/40/50 Series (6 GB+ VRAM) with NVIDIA Game Ready/Studio Driver 550.00+.
* **AMD ROCm:** Radeon RX 7000 (RDNA 3) or RX 9000 (RDNA 4) series with 8 GB+ VRAM.
* **Intel Iris Xe / Arc:** Automatically supported via optimized CPU fallback mode.

---

## 3. Installation Instructions

You have been provided with two installer options:

### Option A: Standard Setup (Recommended for Creators)
* **File:** `Rheo_0.1.0_x64-setup.exe`
1. Double-click `Rheo_0.1.0_x64-setup.exe`.
2. Bypass SmartScreen: Click **More info** → **Run anyway**.
3. Choose installation scope:
   * **Only for me:** Installs to `%LOCALAPPDATA%\Programs\Rheo` (No Administrator prompt).
   * **Anyone who uses this computer:** Installs to `C:\Program Files\Rheo` (Requires Administrator UAC).
4. Follow the setup wizard to completion. A desktop shortcut and Start Menu item will be created.

### Option B: Windows Installer (Recommended for System Administrators)
* **File:** `Rheo_0.1.0_x64_en-US.msi`
1. Double-click `Rheo_0.1.0_x64_en-US.msi`.
2. Follow the standard Windows Installer dialogs to install into `C:\Program Files\Rheo\`.
3. To install silently via PowerShell (Administrator):
   ```powershell
   msiexec.exe /i Rheo_0.1.0_x64_en-US.msi /qn /l*v install.log
   ```

---

## 4. First-Launch & Model Setup

1. **Launch Rheo:** Double-click the **Rheo** shortcut on your desktop or Start Menu.
2. **Wait for First-Run Initialization:** Allow 30–45 seconds for the local Python AI engine to extract its runtime and initialize the database (`%APPDATA%\sh.rheo.app\rheo.db`).
3. **Allow Local Network Access (If Prompted):** If Windows Firewall prompts for network permissions, click **Allow access**. Rheo only binds locally to `127.0.0.1:17493` by default and does not accept outside network connections.
4. **Navigate to the Models Page:** Click **Models** in the left sidebar.
5. **Download Your First Model:**
   * Locate **Kokoro TTS** (recommended default, ~350 MB download).
   * Click **Download**. A pre-flight disk check will verify storage, and a real-time progress bar with download speed and ETA will display.
   * When finished, the status will show **Downloaded**.
6. **Download Speech Recognition (Optional):**
   * Locate **Whisper Tiny** (~150 MB download) or **Whisper Base** (~290 MB download) for dictation.
   * Click **Download**.

---

## 5. Offline Usage & CPU Performance Expectations

### 5.1 Working Completely Offline
Once models are downloaded:
* Rheo operates in **100% offline mode**.
* Disconnect from Wi-Fi or unplug your Ethernet cable.
* Voice generation, voice cloning, audio export, and transcription continue to work without an Internet connection.

### 5.2 CPU Performance Expectations
If you are running on CPU (e.g. standard laptops or systems without discrete NVIDIA/AMD GPUs):
* **Speech Synthesis (Kokoro TTS):** Real-Time Factor (RTF) is approximately **4.0x**. A typical 15-word sentence generates in **15 to 18 seconds**.
* **Transcription (Whisper Tiny):** A 10-second speech recording transcribes in **25 to 35 seconds**.
* On systems with discrete NVIDIA RTX GPUs, generation occurs in near-real-time (<2 seconds per sentence).

---

## 6. Known Beta Limitations

1. **SmartScreen Alert:** Unsigned executable triggers Defender SmartScreen. (Bypass: *More info* → *Run anyway*).
2. **No System Tray Minimization:** Closing the window exits the application. Minimizing to the system tray notification area is not implemented in 0.1.0.
3. **No Windows Action Center Toasts:** Notifications appear within the Rheo window rather than as native Windows slide-in toasts.
4. **Keystroke Simulation Security (UIPI):** In certain elevated applications (like Administrator command prompts), automated dictation paste (Ctrl+V) may be blocked by Windows User Interface Privilege Isolation (UIPI). The transcribed text is always safely preserved on your Windows clipboard.

---

## 7. Uninstallation & Data Safety

Rheo respects your personal data. Uninstalling the application **never** deletes your voice clones, recordings, or downloaded models.

### How to Uninstall:
1. Open Windows **Settings** → **Installed apps** (or **Add or remove programs**).
2. Locate **Rheo**, click the menu icon, and select **Uninstall**.
3. Confirm uninstallation.

### What is Kept vs. Removed:
* **Removed:** Application binaries in `C:\Program Files\Rheo\` or `%LOCALAPPDATA%\Programs\Rheo\`.
* **Safely Preserved:**
  * Your database, voice profiles, and history: `%APPDATA%\sh.rheo.app\`
  * Your downloaded AI models: `%LOCALAPPDATA%\sh.rheo.app\models\`
* *If you wish to completely wipe all models and databases manually, delete the two folders above after uninstallation.*

---

## 8. Diagnostic Logs & Troubleshooting

If you encounter an issue or error:

### 8.1 Locating Diagnostic Logs
* **Application Data & Database:**  
  `%APPDATA%\sh.rheo.app\`  
  *(Press `Win + R`, paste `%APPDATA%\sh.rheo.app\`, and press Enter)*
* **Model Cache:**  
  `%LOCALAPPDATA%\sh.rheo.app\models\`
* **Console Logs:**  
  Press `Ctrl + Shift + I` inside Rheo (if dev tools are enabled) or launch Rheo from PowerShell to view live server logs:
  ```powershell
  & "C:\Program Files\Rheo\Rheo.exe"
  ```

### 8.2 Safe Diagnostic Export
When reporting an issue, **do not share private recordings or API keys**. You can extract the application log safely by copying the terminal output or taking a screenshot of the error modal.

### 8.3 Common Troubleshooting Steps
* **Port Conflict (Port 17493 in use):**  
  Open PowerShell and check if another process is occupying the port:
  ```powershell
  Get-NetTCPConnection -LocalPort 17493 -ErrorAction SilentlyContinue
  ```
  If occupied by a stale Rheo process, kill it:
  ```powershell
  Stop-Process -Name "rheo-server" -Force
  ```
* **Model Download Stalled:**  
  Navigate to **Models**, click **Cancel**, wait 5 seconds, and click **Download** again. Ensure your disk has at least 5 GB free.
* **App Won't Start After Interrupted Launch:**  
  Delete `%TEMP%\_MEI*` temporary directories and relaunch.
