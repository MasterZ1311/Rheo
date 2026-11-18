# RHEO 0.1.0 — BETA TESTER FEEDBACK REPORT

Please use this template to submit your testing results and report issues back to the Rheo engineering team.

> [!CAUTION]
> **Privacy Notice:**  
> **DO NOT** include passwords, API keys, private audio recordings, personal documents, or sensitive credentials in this report. All diagnostic snippets should be scrubbed of personally identifiable information.

---

## 1. System & Hardware Environment

* **Tester Name / ID:** 
* **Operating System Edition & Build:** *(e.g., Windows 11 Pro 23H2 Build 22631.3593)*
* **Processor (CPU):** *(e.g., Intel Core i7-12700H, AMD Ryzen 7 5800X)*
* **Installed RAM:** *(e.g., 16 GB, 32 GB)*
* **Graphics Card (GPU):** *(e.g., NVIDIA RTX 3070 8GB / Intel Iris Xe / None)*
* **GPU Driver Version:** *(e.g., NVIDIA 552.22 / Intel 31.0.101.5333)*
* **Audio Input (Microphone):** *(e.g., USB Blue Yeti, Realtek Internal Mic)*
* **Audio Output (Playback):** *(e.g., Headphones, Realtek High Definition Audio)*

---

## 2. Installation & First-Launch Experience

* **Installer Used:**  
  [ ] NSIS Standard Setup (`Rheo_0.1.0_x64-setup.exe`)  
  [ ] WiX Windows Installer (`Rheo_0.1.0_x64_en-US.msi`)
* **Installation Result:**  
  [ ] Succeeded without issues  
  [ ] Succeeded after SmartScreen warning  
  [ ] Failed *(Describe error below)*
* **SmartScreen Prompt Observed:**  
  [ ] Yes, displayed "Unknown Publisher"  
  [ ] No prompt displayed
* **First-Launch Initialization Duration:**  
  Estimated time before dashboard appeared: `____` seconds *(Expected: 30–45s)*
* **Subsequent Launch Duration:**  
  Estimated time on second launch: `____` seconds *(Expected: 3–5s)*

---

## 3. Core Feature Testing Matrix

Please mark the outcome of each feature you tested:

| Feature / Workflow | Tested? | Status | Notes / Quality Observations |
| :--- | :---: | :---: | :--- |
| **Model Download (Kokoro TTS)** | [ ] | PASS / FAIL | *e.g., Download took 45s, progress was smooth* |
| **Model Download (Whisper STT)** | [ ] | PASS / FAIL | *e.g., Downloaded Whisper Tiny successfully* |
| **Voice Profile Creation** | [ ] | PASS / FAIL | *e.g., Uploaded 10s WAV, profile created* |
| **Speech Generation (Online)** | [ ] | PASS / FAIL | *e.g., Generated 2 sentences; audio clear* |
| **Speech Generation (Offline)** | [ ] | PASS / FAIL | *e.g., Disconnected Wi-Fi; synthesis worked* |
| **Audio Playback & Waveform** | [ ] | PASS / FAIL | *e.g., Player controls responsive, scrub works* |
| **Microphone / Dictation Capture** | [ ] | PASS / FAIL | *e.g., Meter reacted to voice; transcribed accurately* |
| **Global Shortcut Dictation** | [ ] | PASS / FAIL | *e.g., Hotkey triggered capture; pasted into Notepad* |
| **Uninstallation (Data Kept)** | [ ] | PASS / FAIL | *e.g., Uninstalled; `%APPDATA%` data intact* |

---

## 4. Problem & Defect Description (If Applicable)

### 4.1 Issue Severity Classification
Please classify the severity according to this guide:
* **[ ] P0 — Blocker:** Application cannot start, data loss, or security vulnerability.
* **[ ] P1 — Critical:** Core voice generation or model download completely broken.
* **[ ] P2 — Major:** Important feature malfunction (e.g., audio crackles, crash during generation, UI freeze).
* **[ ] P3 — Minor:** Cosmetic UI glitch, alignment issue, or minor usability bug.
* **[ ] P4 — Enhancement:** Feature suggestion or performance improvement idea.

### 4.2 Summary of the Problem
*A clear 1–2 sentence description of what went wrong.*

### 4.3 Steps to Reproduce
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error.

### 4.4 Expected Behavior
*What did you expect to happen?*

### 4.5 Actual Behavior
*What actually happened? (Include exact error text if visible)*

---

## 5. Non-Sensitive Diagnostic Information

### 5.1 Terminal / Console Snippet (If available)
```text
<!-- Paste scrubbed log output or error traceback here -->
```

### 5.2 Screenshots / Visual Evidence
*(Attach screenshot of error modal, blank screen, or corrupted UI if applicable)*
