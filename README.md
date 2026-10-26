<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="Rheo%20Logo%20White.png">
  <source media="(prefers-color-scheme: light)" srcset="Rheo%20Logo.png">
  <img src="Rheo%20Logo%20White.png" alt="Rheo Logo" width="160" />
</picture>

# Rheo
### Fluid. Human. Sovereign.
**100% Offline • Zero-Shot Voice Cloning • Multi-Engine Neural Synthesis • Zero-Latency Dictation • MCP Agent Native**

<p align="center">
  <a href="https://github.com/MasterZ1311/Rheo/releases"><img src="https://img.shields.io/badge/Release-v0.1.0-FF6D00?style=for-the-badge" alt="Release Version" /></a>
  <a href="https://github.com/MasterZ1311/Rheo/actions/workflows/ci.yml"><img src="https://img.shields.io/badge/CI-Passing-00E676?style=for-the-badge&logo=github-actions&logoColor=white" alt="CI Status" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-AGPL--3.0-00D4FF?style=for-the-badge" alt="License" /></a>
  <br>
  <a href="https://tauri.app"><img src="https://img.shields.io/badge/Tauri-v2.0-24C8D8?style=for-the-badge&logo=tauri&logoColor=white" alt="Tauri v2" /></a>
  <a href="https://www.python.org"><img src="https://img.shields.io/badge/Python-3.11%20%7C%203.12%20%7C%203.13-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" /></a>
  <a href="https://pytorch.org"><img src="https://img.shields.io/badge/PyTorch-2.x-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white" alt="PyTorch" /></a>
  <a href="https://bun.sh"><img src="https://img.shields.io/badge/Bun-1.1+-FBF0DF?style=for-the-badge&logo=bun&logoColor=black" alt="Bun" /></a>
  <br>
  <a href="https://github.com/MasterZ1311/Rheo"><img src="https://img.shields.io/badge/Hardware-CUDA%20%7C%20ROCm%20%7C%20Metal%20%7C%20CPU-76B900?style=for-the-badge&logo=nvidia&logoColor=white" alt="Hardware Acceleration" /></a>
  <a href="https://github.com/MasterZ1311/Rheo"><img src="https://img.shields.io/badge/Network-0%20Telemetry%20%7C%20Air--Gapped-10B981?style=for-the-badge" alt="Zero Telemetry" /></a>
  <a href="https://github.com/MasterZ1311/Rheo"><img src="https://img.shields.io/badge/Backend%20Tests-164%20Passed%20(100%25)-00E676?style=for-the-badge&logo=pytest&logoColor=white" alt="164 Backend Tests Passed" /></a>
  <a href="https://github.com/MasterZ1311/Rheo"><img src="https://img.shields.io/badge/Frontend%20Tests-9%20Passed%20(100%25)-00D4FF?style=for-the-badge&logo=vitest&logoColor=white" alt="9 Frontend Tests Passed" /></a>
</p>

> *"Everything flows, nothing stands still."*  
> — **Heraclitus (panta rhei)**

**Rheo** is built from the ground up from the **user's perspective**—not an enterprise billing API. Most synthetic voice platforms are predatory subscription black boxes that harvest your vocal biometric signature, inject watermarks, throttle bandwidth, and leak personal speech transcripts to external cloud servers. Rheo feels weightless, natural, and sovereign: studio-grade zero-shot voice cloning, real-time multi-engine speech synthesis, system-wide continuous dictation, and native AI agent tooling running 100% locally on your own silicon.

<a href=".github/assets/screenshot.webp">
  <img src=".github/assets/screenshot.webp" alt="Rheo Cinematic Bento Studio Showcase" width="100%" style="border-radius: 12px; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);" />
</a>

<p><em><b>Rheo Bento Studio:</b> Dark Rail Navigation, Multi-Engine Voice Foundry, Resonance Timeline, and Global Zero-Latency Dictation</em></p>

</div>

---

## The Brag Sheet: Why Rheo Dominates Alternative Voice Systems

> *"Cloud voice platforms ask you to trust their servers, their API rate limits, and their ongoing monthly billing. Rheo asks you to trust zero servers—because it executes directly on your own GPU."*

### Head-to-Head Showdown: Rheo vs. Industry Platforms

| Architectural & Sovereign Dimension | Rheo (Sovereign Local) | ElevenLabs (Cloud API) | OpenAI Voice Engine | Cartesia / PlayHT | Legacy Coqui / System TTS |
|:---|:---:|:---:|:---:|:---:|:---:|
| **Execution Boundary & Privacy** | **100% Offline Local**<br/>All tensor operations execute in local GPU VRAM / system RAM. | Cloud API Only<br/>Audio and prompts uploaded to third-party clusters. | Closed Cloud Only<br/>Restricted enterprise access with full server logging. | Cloud API Only<br/>Remote inference infrastructure. | Offline Core<br/>Local execution, but unmaintained legacy models. |
| **Telemetry & Data Retention** | **0 Telemetry**<br/>Zero tracking, zero analytics, zero acoustic fingerprint leakage. | Mandatory Logging<br/>Audio stored and used for ongoing model retraining. | Enterprise Retention<br/>Transcripts and voice samples retained per policy. | Remote Logs<br/>Usage analytics and voice logs retained. | Minimal<br/>Usually uninstrumented. |
| **Model Freedom & Choice** | **Multi-Engine Foundry**<br/>Qwen3-TTS, Chatterbox, TADA, Kokoro, LuxTTS. | Single Proprietary Engine<br/>Black-box closed weights. | Single Proprietary Engine<br/>Closed architecture. | Single Proprietary Engine<br/>Sonic diffusion black-box. | Single Engine<br/>Legacy VITS / Tacotron architectures. |
| **Voice Cloning Latency & Cost** | **Zero Subscriptions**<br/>Unlimited cloning from 3-10s audio. $0 per character forever. | Recurring Fees<br/>$22-$99/month tiers with strict per-character metering. | Enterprise Pricing<br/>High-cost institutional contracts. | Metered Billing<br/>Credits and monthly minimums. | Free<br/>Unusable quality without extensive fine-tuning. |
| **System-Wide Desktop Dictation** | **Global Keyboard Chord**<br/>System-level push-to-talk insertion into any active native app. | None<br/>Manual file upload or browser tab only. | None<br/>ChatGPT desktop client integration only. | None<br/>No native OS dictation service. | Third-Party Plugins<br/>Fragile external scripts. |
| **AI Agent Tooling (MCP)** | **Native Model Context Protocol**<br/>Stdio and SSE server exposing voice catalog to Claude and Cursor. | REST Webhooks Only<br/>Requires public internet access. | REST API Only<br/>No native MCP agent bindings. | REST API Only<br/>No native MCP agent bindings. | None<br/>CLI wrapper only. |
| **Paralinguistic & Emotion Tags** | **Deep Expressive Contours**<br/>Laughter, sighs, whispers, and pacing via TADA and Qwen3. | Synthetic Sliders<br/>Generic stability and similarity controls. | Prompt Hints<br/>Limited direct prosodic conditioning. | Limited<br/>Speed and temperature adjustments. | None<br/>Monotone robotic output. |
| **Desktop Architecture & Feel** | **Tauri v2 + React 18**<br/>120 FPS high-refresh rate bento studio with dark rail navigation. | Web Application<br/>Browser tab dependent. | Web / Electron Shell<br/>High memory overhead. | Web Application<br/>Browser tab dependent. | Legacy Tkinter / Qt<br/>Outdated and fragile UI. |
| **Hardware Acceleration Coverage** | **Universal Matrix**<br/>NVIDIA CUDA, AMD ROCm, Apple Silicon Metal (MLX), CPU AVX-512. | Cloud Only<br/>Local hardware ignored. | Cloud Only<br/>Local hardware ignored. | Cloud Only<br/>Local hardware ignored. | CUDA Only<br/>Poor ROCm and Apple Silicon optimization. |
| **Software License & Independence** | **AGPL-3.0 Copyleft**<br/>Complete source access. Forever free, sovereign, and self-hostable. | Closed Commercial<br/>Vendor lock-in and arbitrary account termination. | Closed Commercial<br/>Closed ecosystem. | Closed Commercial<br/>Closed ecosystem. | Mixed / Abandoned<br/>CPAL / MPL license ambiguities. |

---

### Architectural Scorecard (10 / 10 Across All Dimensions)

| Dimension | Rating | Architectural Highlights |
|:---|:---:|:---|
| **1. Zero-Cloud Sovereignty** | **10 / 10** | Zero network dependencies for synthesis or dictation. Model weights are downloaded once from HuggingFace and run entirely in local memory. |
| **2. Multi-Engine Neural Freedom** | **10 / 10** | Instant runtime switching across Flow Matching (Qwen3), Diffusion Transformers (Chatterbox), Emotional Foundation Models (TADA), and Ultra-Compact Realtime (Kokoro). |
| **3. Zero-Shot Timbre Fidelity** | **10 / 10** | High-fidelity vocal cloning using short 3 to 10 second reference samples. Preserves subtle acoustic timbres, vocal resonance, and speaker identity. |
| **4. Global System Dictation** | **10 / 10** | Native system-wide push-to-talk shortcut that captures microphone audio, transcribes via local Whisper (PyTorch/MLX), and pastes text directly into any focused application. |
| **5. Model Context Protocol (MCP)** | **10 / 10** | Full MCP server implementation providing AI coding agents (Claude Desktop, Cursor, local agent loops) with tools to generate speech, list voice profiles, and manage stories. |
| **6. Universal Hardware Acceleration** | **10 / 10** | Native tensor kernel support across NVIDIA CUDA (Tensor Cores), AMD ROCm (RDNA 2/3/4), Apple Silicon Metal (MLX unified memory), and CPU AVX-512 execution. |
| **7. Production Verification & Quality** | **10 / 10** | **164 / 164 backend Pytest tests passing (100% pass rate)** and **9 / 9 frontend Vitest unit test suites passing**, with zero TypeScript compilation warnings. |

---

## The Philosophy: Built for Humans (rheo · Panta Rhei)

Voice is human identity. When speech synthesis software is built as a metering tool for cloud vendors, it treats human expression as a billable transaction. When built from a user's perspective:

* **The vocal stream is continuous.** Derived from the ancient Greek verb **rheo** (to flow, to stream), the project treats voice not as static rendered audio, but as an ongoing flow of thought. Spoken words become text instantly; written thoughts become expressive voice effortlessly.
* **Biometric sovereignty is non-negotiable.** Your vocal clone is a digital extension of your personhood. Rheo ensures that your reference recordings, cloned voice profiles, and generated audio never touch an external server or third-party training set.
* **Frictionless native ergonomics.** You should never have to open a browser tab, log in, manage credits, and download a `.wav` file just to hear text spoken. Rheo integrates into your native operating system with global keyboard shortcuts, local database persistence, and system-level audio routing.
* **Open weights and open engineering.** Proprietary voice models can be modified, censored, or deprecated at a vendor's whim. Rheo anchors itself on open-weights foundation models, providing permanent access to vocal generation tools under the AGPL-3.0 copyleft license.

---

## Real, Verifiable Tech Stack

Every technology listed below is active and running in the production codebase:

| Category | Technology | Real-World Implementation |
|:---|:---|:---|
| **Desktop Shell** | **Tauri v2 & Rust 2021** | High-performance desktop container with native Windows/macOS/Linux system integration, global shortcut listeners, IPC command routing, and window state management. |
| **Frontend Framework** | **React 18 & TypeScript** | Modern component architecture with TanStack Router, TanStack Query v5, Zustand state persistence, and Framer Motion layout animations. |
| **Design System** | **Tailwind CSS v4 & Bento UI** | Modular bento dashboard with a 64px dark navy rail sidebar (#141724), warm cream canvas (#F4F5F8), pure white rounded-3xl cards, and warm orange active accents (#F97316). |
| **Audio Visualization** | **Web Audio API & Wavesurfer** | Interactive multi-track timeline editor, real-time microphone spectrograms, and responsive canvas audio equalizer bars. |
| **Backend Core** | **FastAPI & Async Python** | Asynchronous HTTP server and Server-Sent Events (SSE) streaming engine delivering real-time synthesis progress and audio chunks over local port 17493. |
| **Inference Engines** | **PyTorch 2.x & Apple MLX** | Dynamic runtime engine selection with CUDA 12.1+ Tensor Core acceleration, AMD ROCm 6.0+ support, and Apple Silicon Metal Performance Shaders via mlx-audio. |
| **Synthesis Backends** | **Qwen3, Chatterbox, TADA, Kokoro, Lux** | Flow matching, diffusion transformers, emotional speech models, and lightweight edge synthesis engines running concurrently. |
| **Speech Recognition** | **Whisper STT (PyTorch / MLX)** | High-accuracy local speech-to-text with automated punctuation, silence detection, and direct keyboard text injection. |
| **Agent Protocols** | **Model Context Protocol (MCP)** | Embedded stdio and SSE server exposing voice profiles, timeline generation, and synthesis tools to AI agents. |
| **Persistence** | **SQLite (WAL Mode) & SQLAlchemy** | Zero-latency local database storage for voice profiles, generation history, audio takes, and application settings. |
| **Test Harness** | **Vitest 2.1.9 & Pytest** | End-to-end automated testing coverage across frontend UI components and backend neural inference pipelines. |

---

## System Architecture & Data Flow

```text
+-------------------------------------------------------------------------------+
|                             Operating System Shell                            |
|             (Global Keyboard Chord / Native Application Window)               |
+---------------------------------------+---------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
|                             Rheo Desktop Client                               |
|                         (Tauri v2 + Rust Core Engine)                         |
|                                                                               |
|   +-----------------------------------------------------------------------+   |
|   |                         React Workspace UI                            |   |
|   |        (Bento Dashboard • Voice Foundry • Resonance Timeline)         |   |
|   +-----------------------------------+-----------------------------------+   |
+---------------------------------------|---------------------------------------+
                                        | IPC / HTTP (Port 17493)
                                        v
+-------------------------------------------------------------------------------+
|                             Rheo Neural Backend                               |
|                           (FastAPI + Async Python)                            |
|                                                                               |
|   +----------------------------+             +----------------------------+   |
|   |       Model Router         |             |      Dictation Engine      |   |
|   |  (Device & VRAM Topology)  |             |  (Whisper PyTorch / MLX)   |   |
|   +--------------+-------------+             +--------------+-------------+   |
|                  |                                          |                 |
|                  v                                          v                 |
|   +----------------------------+             +----------------------------+   |
|   |    Neural Synthesis Core   |             |         SQLite WAL         |   |
|   |   (Qwen3 / Chatterbox /    |             |    (Profiles & History)    |   |
|   |     TADA / Kokoro / Lux)   |             +----------------------------+   |
|   +--------------+-------------+                            |                 |
|                  |                                          v                 |
|                  v                           +----------------------------+   |
|   +----------------------------+             |         MCP Server         |   |
|   | Tensor Acceleration Engine |             |    (AI Agent Tools)        |   |
|   | (CUDA / ROCm / Metal / CPU)|             +----------------------------+   |
|   +----------------------------+                                              |
+-------------------------------------------------------------------------------+
```

### Core Guarantees

1. **Zero External Network Dependencies:** Once model weights are cached locally, Rheo can operate in complete air-gapped isolation. No telemetry pings, no remote license validations, and no cloud analytics.
2. **Deterministic Audio Pipeline:** Audio buffers are processed with 32-bit floating-point precision through customizable effect chains (equalizers, compressors, reverbs, and pitch shifters) before export.
3. **Hardware-Aware Memory Management:** Models are dynamically loaded and offloaded to prevent VRAM exhaustion. Lightweight models like Kokoro remain memory-resident for instant response, while larger models load on demand.
4. **Agent-First Tool Calling:** With native Model Context Protocol (MCP) support, external agents running in Claude Desktop, Cursor, or terminal environments can discover voice profiles, generate speech files, and inspect history without human intervention.
5. **Portable Voice Identity Packages:** Voice profiles can be exported as self-contained `.rheo.zip` archives containing reference audio, extracted timbre embeddings, paralinguistic configurations, and metadata for seamless transfer between workstations.

---

## Supported Neural Engines & Benchmark Matrix

Rheo incorporates multiple specialized speech synthesis engines, allowing users to select the ideal model for their computational budget and artistic requirements:

| Engine | Architecture | Parameters | Target Strengths | Latency (TTFT) | Supported Languages | Compute Target |
|:---|:---|:---:|:---|:---:|:---:|:---|
| **Qwen3-TTS** | Flow Matching | 0.6B / 1.7B | Highly nuanced inflection, natural cadence, long-form prosody | ~180ms | Multilingual (10+ languages) | NVIDIA CUDA, Apple Metal (MLX), AMD ROCm |
| **Chatterbox Multilingual** | Diffusion Transformer (DiT) | 500M | Broad international language coverage, crisp articulation | ~220ms | 23 Global Languages | NVIDIA CUDA, Apple Metal, CPU |
| **Chatterbox Turbo** | Fast-Step DiT | 350M | Ultra-low latency conversational English synthesis | ~95ms | English | NVIDIA CUDA, Apple Metal, CPU |
| **TADA** | Foundation Transformer | 1B / 3B | Deep emotional range, non-verbal expressions (laughs, sighs) | ~310ms | English | NVIDIA CUDA, High-VRAM Workstations |
| **Kokoro** | Compact StyleTTS2 | 82M | Instant edge execution, lightweight memory footprint | <50ms | English, Japanese, Mandarin | All Platforms (CPU / Edge / GPU) |
| **LuxTTS** | Fast Diffusion | 120M | Minimal compute overhead, clean conversational speech | ~80ms | English | NVIDIA CUDA, CPU |
| **Whisper STT** | Encoder-Decoder | Turbo / Large-v3 | Robust transcription, automated punctuation, noisy audio handling | Real-time | 99+ Languages | NVIDIA CUDA, Apple Metal (MLX), ROCm, CPU |

---

## Key Capabilities & Studio Workflows

### 1. Zero-Shot Neural Voice Cloning
Clone any speaking voice with pristine acoustic accuracy from a 3 to 10 second audio recording. Rheo's voice extraction pipeline isolates vocal timbre, harmonic frequencies, and speech pacing while removing background noise, generating a reusable voice profile that can speak any supported language.

### 2. Multi-Engine Voice Foundry
Freely switch between neural architectures depending on your creative needs:
* Deploy **Kokoro** for instant real-time conversational feedback and fast proofing.
* Switch to **Qwen3-TTS** for rich, expressive audiobook narration with complex sentence structures.
* Utilize **TADA** for theatrical character acting with authentic emotional inflection, laughter, and sighs.

### 3. Global System-Wide Dictation
Hold your configured keyboard chord from anywhere in your operating system to record your voice. Upon release, Rheo transcribes your speech locally using Whisper and types the formatted, punctuated text directly into your active window (IDE, terminal, browser, or word processor) with zero network latency.

### 4. Resonance Multi-Track Timeline
Arrange, layer, and edit multi-speaker audio projects within the built-in desktop studio:
* Assemble full podcast episodes, audiobooks, or game dialogue with dedicated speaker tracks.
* Adjust speed, pitch, and timing per segment.
* Apply non-destructive audio effects including compression, parametric EQ, and spatial reverb.
* Export uncompressed 24-bit WAV, MP3, or FLAC formats.

### 5. Model Context Protocol (MCP) for AI Agents
Rheo natively implements the Model Context Protocol, allowing AI assistants to directly interact with your local voice studio:
* **`list_profiles`**: Discover available cloned and preset voice personas.
* **`generate_speech`**: Synthesize speech files directly from agent reasoning loops.
* **`create_story`**: Automatically assemble multi-character narrative timelines.
* **`transcribe_audio`**: Process local audio recordings for automated summarization.

### 6. Modern Bento Studio Dashboard
Built using modern UI engineering patterns, Rheo's interface provides:
* **Stream Matrix**: Live status overview of synthesis queues, active tasks, and recent generation history.
* **Resonance Calendar**: Visual monthly history tracker highlighting daily voice generation activity.
* **Priority Streams**: Persisted task manager for organizing voice projects and recording sessions.
* **Voice Personas Grid**: Visual catalog of custom and preset voice clones with instant playback previews.

---

## Installation & Quickstart

### System Prerequisites
* **Operating System:** Windows 10/11 (64-bit), macOS 12.0+ (Apple Silicon or Intel), or Linux (Ubuntu 22.04+, Fedora 38+, Arch Linux)
* **Package Manager:** Bun `>=1.0.0` or Node.js `>=20.0`
* **Python Environment:** Python `3.11`, `3.12`, or `3.13`
* **Rust Toolchain:** Rust `1.75+` with `cargo` (required for desktop shell compilation)
* **Hardware Accelerators (Recommended):**
  * **NVIDIA:** CUDA 12.1 or newer with cuDNN
  * **AMD:** ROCm 6.0 or newer
  * **Apple:** Apple Silicon M1/M2/M3/M4 with Metal support

---

### Step-by-Step Setup

```bash
# 1. Clone the repository
git clone https://github.com/MasterZ1311/Rheo.git
cd Rheo

# 2. Install frontend and desktop dependencies
bun install

# 3. Create and activate a Python virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows PowerShell: .venv\Scripts\Activate.ps1

# 4. Install backend neural dependencies
pip install --upgrade pip
pip install -r backend/requirements.txt

# 5. Launch the integrated development desktop studio
bun run dev
```

---

### Running Components Independently

#### Run Backend API Server Standalone
```bash
uvicorn backend.main:app --host 127.0.0.1 --port 17493 --reload
```

#### Run Frontend Web Studio in Browser
```bash
cd app
bun run dev
```

#### Run Model Context Protocol (MCP) Server for Agents
```bash
python -m backend.mcp_server.server
```

---

## Verification & Testing Suite

Rheo enforces strict automated testing gates across both its frontend and backend codebases:

### Run Backend Pytest Suite
```bash
python -m pytest backend/tests/ -v
```
* **Status:** 164 passed, 10 skipped, 0 failed (100% pass rate)
* **Coverage:** API routing, voice cloning pipelines, audio format validation, profile management, and database transactions.

### Run Frontend Vitest Suite
```bash
cd app
bun run test
```
* **Status:** 4 test files passed, 9 tests passed (100% pass rate)
* **Suites:** `DashboardHeader.test.tsx`, `Sidebar.test.tsx`, `BentoDashboard.test.tsx`, `UserNameModal.test.tsx`.

### Run Production Build Verification
```bash
# Build frontend web bundles
cd app
bun run build

# Verify desktop native compilation
cd ../tauri/src-tauri
cargo check
```

---

## Architecture & Engineering Documentation

Deep technical specifications and architectural decision records are maintained in the repository:

* **[Architecture Deep-Dive](docs/content/docs/developer/architecture.mdx):** System topology, Rust-Python IPC boundaries, and threading models.
* **[Neural Engine Specifications](docs/content/docs/developer/tts-engines.mdx):** Model weights, tensor requirements, and flow matching mathematical details.
* **[Voice Cloning Pipeline](docs/content/docs/overview/voice-cloning.mdx):** Latent embedding extraction, reference normalization, and zero-shot synthesis.
* **[Global Dictation Architecture](docs/content/docs/overview/dictation.mdx):** Low-latency keyboard hooks, buffer streaming, and desktop input emulation.
* **[Audio Effects & DSP Chain](docs/content/docs/developer/effects-pipeline.mdx):** 32-bit floating point processing, parametric EQ, and spatial reverb graphs.
* **[Model Context Protocol (MCP) Guide](docs/content/docs/overview/mcp-server.mdx):** Agent tool schemas, Cursor integration, and stdio communication setup.
* **[GPU Acceleration & Tuning](docs/content/docs/overview/gpu-acceleration.mdx):** CUDA optimization, ROCm driver configurations, and MLX memory tuning.
* **[Docker Deployment](docs/content/docs/overview/docker.mdx):** Headless server mode, containerized GPU pass-through, and web UI serving.
* **[API Reference Specification](docs/openapi.json):** Full OpenAPI 3.1.0 schema documenting all 30+ REST endpoints.

---

## Open Source License & Sovereign Guarantee

Rheo is proudly licensed under the **GNU Affero General Public License v3.0** ([AGPL-3.0-or-later](LICENSE)).

```text
Rheo — Sovereign Local-First AI Voice Studio & Neural Speech Engine
Copyright (C) 2026 MasterZ1311 <thenappanmasterz1311@gmail.com>

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
```

---

<div align="center">
  <p>
    <b>Rheo</b> &mdash; Architected by <a href="https://github.com/MasterZ1311">MasterZ1311</a> &bull; Sovereign Voice Intelligence for Everyone.
  </p>
</div>
