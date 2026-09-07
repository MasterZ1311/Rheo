# Rheo Architecture & Development Roadmap

> Sovereign Local-First AI Voice Studio · Maintained by [MasterZ1311](https://github.com/MasterZ1311) · Current Version: **v0.1.0**

---

## Architecture Overview

Rheo unites a native desktop shell, a modern web-standard workspace, and an asynchronous Python deep learning engine into a seamless, privacy-preserving voice workstation.

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

## Core Subsystems

### 1. Neural TTS Engine Registry
The backend defines a unified `TTSBackend` protocol (`backend/backends/__init__.py`) supporting pluggable speech engines:
- **Qwen3-TTS (0.6B & 1.7B):** High-fidelity flow matching model with contextual prosody. Supported via PyTorch (CUDA, ROCm, CPU) and MLX (Apple Silicon Metal).
- **Chatterbox Multilingual:** Fast diffusion transformer supporting 23 spoken languages.
- **Chatterbox Turbo:** Optimized low-latency English model with paralinguistic tag insertion (`[laughter]`, `[sigh]`, `[whisper]`).
- **TADA (HumeAI):** Deep emotion and conversational vocal expression foundation model.
- **Kokoro 82M:** Ultra-compact CPU-optimized synthesis delivering real-time responses under 50ms.
- **LuxTTS:** Lightweight edge diffusion model.

### 2. Zero-Latency System Dictation
- Background global keyboard chord listener (`tauri/src-tauri/src/hotkey_monitor.rs`).
- Native platform audio capture (`tauri/src-tauri/src/audio_capture/`).
- Local Whisper transcription with automatic punctuation and optional local LLM cleanup.
- Synthetic paste injection into the currently focused system window (`tauri/src-tauri/src/clipboard.rs`).

### 3. Model Context Protocol (FastMCP)
- Embedded stdio shim (`tauri/src-tauri/binaries/rheo-mcp`) and SSE server.
- Allows AI coding assistants (Claude Code, Cursor, Windsurf) to query voice profiles, trigger generation, and speak to the user using cloned voices.

### 4. Local Persistence & Audio Pipeline
- SQLite database (`rheo.db`) storing voice profiles, generation timeline history, and audio effect presets.
- Non-destructive 32-bit float audio processing pipeline with parameter EQ, compressor, limiter, and reverb.

---

## Development Roadmap

### Phase 1: Engine Hardening & Streaming (Current)
- [x] Unify multi-engine architecture under AGPL-3.0 copyleft license.
- [x] Native AMD ROCm acceleration for RDNA 2, 3, and 4 on Windows and Linux.
- [x] Apple Silicon Metal acceleration via MLX 0.30+.
- [ ] Chunked chunk-streaming TTS playback for sub-200ms first-audio response.

### Phase 2: Studio Workflow & Timeline
- [ ] Multi-speaker dialogue script editor with automated profile assignment.
- [ ] Fine-grained phoneme and pitch curve manipulation.
- [ ] Audio export presets for podcasting, audiobook mastering, and video syncing.

### Phase 3: Agent Protocols & Integrations
- [ ] Bi-directional real-time speech-to-speech voice conversation mode with local LLMs.
- [ ] Extended FastMCP tool suite for timeline automation and batch generation.

---

© 2026 MasterZ1311 · Rheo — Sovereign Local-First AI Voice Studio
