# Changelog

All notable changes to the **Rheo** project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Bento Dashboard with Live Data**:
  - Integrated live API endpoints (`GET /api/history` and `GET /profiles`) across all 5 bento cards.
  - Dynamic Resonance Calendar with generation activity indicators and month navigation.
  - Persisted Priority Streams (Tasks) with interactive checkmarks, creation, and deletion in `uiStore`.
  - Real-time Voice Streams Directory and Persona Cards with online avatars and initials fallback.
  - Loading skeletons and empty-state placeholders for all dashboard widgets.
- **Unified Design System**:
  - Standardized application-wide aesthetic: warm cream canvas (`#F4F5F8`), pure white cards (`rounded-3xl`), and warm orange active accents (`#F97316`).
  - Elevated Voice Studio (`/studio`), Voice Profiles (`/voices`), Story Timeline (`/stories`), Captures (`/captures`), Models (`/models`), and Settings into modern bento cards.
- **User Onboarding & Personalization**:
  - Dynamic name prompt modal (`UserNameModal.tsx`) with persistent storage and inline profile editing.
  - 6-step guided onboarding tour (`OnboardingTour.tsx`) covering neural synthesis, cloning, and dictation.
- **Testing & Packaging**:
  - Vitest + React Testing Library frontend test suite with 4 unit test suites (9 passing tests).
  - Generated native macOS bundle icon (`tauri/src-tauri/icons/icon.icns`) with multi-resolution icon layers.
  - High-resolution UI mockup screenshots, social preview cards, and OpenGraph metadata (`og.webp`).

### Changed
- Rebuilt navigation sidebar as a fixed 64px dark navy rail (`#141724`) with smooth orange indicator pills.
- Cleaned and modernized Settings capsule navigation and two-column general configuration layout.

### Fixed
- Fixed Windows titlebar/taskbar icon visibility bug in Tauri native runtime.
- Purged all dead external links and purged legacy crypto token code and unused assets.

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
