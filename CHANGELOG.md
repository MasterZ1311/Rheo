# Changelog

All notable changes to the **Rheo** project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] - 2026-09-07

### Initial Release of Rheo

Initial sovereign release of **Rheo**, the local-first AI voice studio, zero-shot neural speech cloner, and system-wide zero-latency dictation engine.

#### Core Capabilities
- **Multi-Engine Neural Synthesis:** Native support for Qwen3-TTS (0.6B and 1.7B), Chatterbox Multilingual (23 languages), Chatterbox Turbo, TADA (HumeAI Foundation), Kokoro 82M, and LuxTTS.
- **Zero-Shot Voice Cloning:** Instant timbre extraction and neural speech generation from short reference audio recordings.
- **Global Dictation Engine:** System-wide push-to-talk transcription powered by local Whisper models (PyTorch and MLX backends).
- **Model Context Protocol (MCP):** Embedded stdio and SSE server exposing voice profiles, timeline generation, and synthesis tools to AI agents.
- **Cross-Platform Acceleration:** Full native execution on NVIDIA CUDA, AMD ROCm (RDNA 2/3/4), Apple Silicon Metal (MLX), and CPU.
- **Tauri Desktop Client:** Ultra-clean, high-performance desktop shell built on Rust and Tauri v2 with React workspace.
- **Sovereign Privacy Architecture:** Fully local database, zero telemetry, offline-capable model loading, and AGPL-3.0 copyleft licensing.

---

© 2026 MasterZ1311 · Rheo — Sovereign Local-First AI Voice Studio
