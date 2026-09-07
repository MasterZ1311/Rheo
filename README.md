<p align="center">
  <img src="Rheo Logo.png" alt="Rheo Logo" width="140" height="140" />
</p>

<h1 align="center">Rheo</h1>

<p align="center">
  <strong>Sovereign Local-First AI Voice Studio & Neural Speech Engine</strong><br/>
  Zero-shot neural voice cloning, multi-engine speech synthesis, system-wide zero-latency dictation, and Model Context Protocol (MCP) voice integration.<br/>
  100% private, offline-capable, and running directly on your own hardware.
</p>

<p align="center">
  <a href="https://github.com/MasterZ1311/Rheo/releases">
    <img src="https://img.shields.io/github/v/release/MasterZ1311/Rheo?style=flat-square&color=black" alt="Release" />
  </a>
  <a href="https://github.com/MasterZ1311/Rheo/actions/workflows/ci.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/MasterZ1311/Rheo/ci.yml?branch=MZ-Main&style=flat-square&color=black&label=CI" alt="CI Build" />
  </a>
  <a href="https://github.com/MasterZ1311/Rheo/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/License-AGPL--3.0-black.svg?style=flat-square" alt="License" />
  </a>
  <a href="https://github.com/MasterZ1311">
    <img src="https://img.shields.io/badge/Maintained%20by-MasterZ1311-black.svg?style=flat-square" alt="Author" />
  </a>
  <img src="https://img.shields.io/badge/Platform-macOS%20%7C%20Windows%20%7C%20Linux-black?style=flat-square" alt="Platform" />
  <img src="https://img.shields.io/badge/Acceleration-CUDA%20%7C%20ROCm%20%7C%20Metal-black?style=flat-square" alt="Hardware Acceleration" />
</p>

<p align="center">
  <a href="#key-capabilities">Capabilities</a> •
  <a href="#supported-engines">Engines</a> •
  <a href="#quickstart">Quickstart</a> •
  <a href="#hardware-support">Hardware</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#license">License</a>
</p>

---

## Overview

**Rheo** is an open-source, local-first voice computing environment engineered for maximum fidelity, complete privacy, and zero data leakage. By executing state-of-the-art neural speech models locally on modern GPUs and Apple Silicon, Rheo delivers studio-grade voice cloning and responsive speech-to-text without recurring API subscriptions or cloud latency.

Whether you need to generate expressive audiobooks, clone your vocal identity for content creation, dictate continuously into native desktop applications, or empower AI coding agents with speech via the Model Context Protocol (MCP), Rheo provides a unified and extensible platform.

---

## Key Capabilities

- **Zero-Shot Voice Cloning:** Clone reference voices using short audio samples (3–10 seconds) with exceptional timbre and prosody retention.
- **Multi-Engine Speech Synthesis:** Seamlessly swap between leading open-weights models tailored for latency, multilingual coverage, or ultra-expressive acting.
- **Global System Dictation:** Hold a global keyboard chord to capture system microphone audio and transcribe it directly into whichever application is currently focused.
- **Model Context Protocol (MCP) Integration:** Expose your voice catalog directly to Claude, Cursor, and custom agent workflows with native tool calls.
- **Local Timeline & Multi-Track Studio:** Compose, arrange, splice, and export speech segments with customizable paralinguistic tags, pitch control, and audio effect chains.
- **100% Offline by Design:** Weights are downloaded once from HuggingFace and execute entirely in memory on your workstation. No analytics, tracking, or telemetry.

---

## Supported Neural Engines

| Engine | Core Architecture | Target Strengths | Platform Support |
| :--- | :--- | :--- | :--- |
| **Qwen3-TTS** | 0.6B / 1.7B Flow Matching | Natural cadence, deep reasoning, nuanced inflection | CUDA, Apple Metal (MLX), ROCm, CPU |
| **Chatterbox Multilingual** | Flow-based DiT | 23 international languages with high intelligibility | CUDA, Apple Metal, CPU |
| **Chatterbox Turbo** | Fast Latency DiT | Sub-second English generation with paralinguistic tags | CUDA, Apple Metal, CPU |
| **TADA** | 1B / 3B HumeAI Foundation | Complex emotional contours, laughter, sighs, pacing | CUDA, CPU |
| **Kokoro** | 82M Ultra-Compact | Blazing CPU realtime inference (sub-50ms TTFT) | All platforms (CPU/GPU) |
| **LuxTTS** | Fast Diffusion | Lightweight compute profile for edge deployments | CUDA, CPU |
| **Whisper STT** | OpenAI / MLX Whisper | High-accuracy speech-to-text with auto-punctuation | CUDA, Metal, ROCm, CPU |

---

## Quickstart

### Prerequisites
- **Node/Bun:** Bun `>=1.0.0` or Node.js `>=20.0`
- **Python:** Python `3.11`, `3.12`, or `3.13`
- **Rust:** Rust toolchain `1.75+` (for building the Tauri desktop bundle)
- **GPU Tooling:**
  - NVIDIA: CUDA 12.1+ / cuDNN
  - AMD: ROCm 6.0+
  - Apple: macOS 12.0+ (Metal Performance Shaders / MLX)

### Installation & Development

```bash
# Clone repository
git clone https://github.com/MasterZ1311/Rheo.git
cd Rheo

# Install workspace frontend dependencies
bun install

# Configure Python virtual environment & backend packages
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt

# Run development server with Tauri desktop shell
bun run dev
```

### Running Backend Independently

```bash
uvicorn backend.main:app --host 127.0.0.1 --port 17493 --reload
```

---

## Hardware Support

Rheo automatically inspects your compute topology on initialization and dynamically assigns optimal tensor backends:

- **NVIDIA GPUs:** Native PyTorch with Tensor Cores, flash-attention, and CUDA execution.
- **AMD Radeon GPUs:** Native ROCm acceleration on Linux and Windows (RDNA 2, RDNA 3, and RDNA 4).
- **Apple Silicon:** Metal Acceleration via `mlx` and `mlx-audio` unified memory architecture.
- **CPU Fallback:** Optimized AVX-512 / AVX2 execution paths using lightweight models like Kokoro and LuxTTS.

---

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                    Rheo Desktop Shell                       │
│              (Tauri v2 + Rust Core Engine)                  │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │               React Workspace UI                    │   │
│   │      (Vite + Tailwind CSS + TanStack Query)         │   │
│   └──────────────────────────┬──────────────────────────┘   │
└──────────────────────────────┼──────────────────────────────┘
                               │ HTTP / WebSocket (Port 17493)
┌──────────────────────────────▼──────────────────────────────┐
│                    Rheo Neural Backend                      │
│                  (FastAPI + Async Python)                   │
│                                                             │
│   ┌───────────────────────┐     ┌───────────────────────┐   │
│   │     TTS Backends      │     │      STT Backend      │   │
│   │ (Qwen3, Chatterbox,   │     │   (Whisper PyTorch /  │   │
│   │  TADA, Kokoro, Lux)   │     │       MLX Engine)     │   │
│   └───────────────────────┘     └───────────────────────┘   │
│   ┌───────────────────────┐     ┌───────────────────────┐   │
│   │      SQLite DB        │     │      MCP Server       │   │
│   │  (Profiles & Studio)  │     │  (AI Agent Protocols) │   │
│   └───────────────────────┘     └───────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Project Watermark & Ownership

- **Project:** Rheo
- **Repository:** [MasterZ1311/Rheo](https://github.com/MasterZ1311/Rheo)
- **Maintainer:** [MasterZ1311](https://github.com/MasterZ1311) (`thenappanmasterz1311@gmail.com`)
- **License:** GNU Affero General Public License v3.0 ([AGPL-3.0-or-later](LICENSE))

---

<p align="center">
  <sub>&copy; 2026 MasterZ1311 &middot; Rheo &mdash; Sovereign Local-First AI Voice Studio. All rights reserved.</sub>
</p>
