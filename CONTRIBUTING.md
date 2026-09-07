# Contributing to Rheo

Thank you for your interest in contributing to **Rheo**! We welcome contributions from engineers, researchers, and creators passionate about open-source, local-first artificial intelligence and neural audio processing.

This guide outlines our development workflow, engineering standards, and contribution processes.

---

## Code of Conduct

All contributors and participants in the Rheo ecosystem are expected to adhere to our [Code of Conduct](.github/CODE_OF_CONDUCT.md). Please treat all community members with respect, professional courtesy, and collaboration.

---

## Development Workflow

### 1. Fork & Clone
Fork the repository on GitHub and clone your fork locally:
```bash
git clone https://github.com/MasterZ1311/Rheo.git
cd Rheo
```

### 2. Environment Setup
Rheo uses a monorepo structure containing a Rust/Tauri desktop shell, React frontend applications, and a Python FastAPI neural inference engine.

```bash
# Install frontend workspace dependencies
bun install

# Configure Python virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
```

### 3. Running Development Builds
```bash
# Start full desktop development environment (Tauri + React + backend)
bun run dev

# Or run the web workspace independently
bun run dev:web

# Or run the FastAPI inference engine directly
uvicorn backend.main:app --reload --port 17493
```

---

## Architecture Guidelines

- **Local-First & Privacy First:** No user data, audio recordings, or generation metadata may ever leave the user's workstation. External API calls must only occur for explicit HuggingFace model weight downloads when approved by the user.
- **Protocol Separation:** Backend TTS/STT engines must implement the `TTSBackend` or `STTBackend` abstract protocols defined in `backend/backends/`.
- **Cross-Platform Compatibility:** Features must consider Windows, macOS (Apple Silicon), and Linux runtime characteristics. Platform-specific dependencies should use conditional imports or requirements.
- **Type Safety & Linting:** 
  - Frontend code is checked with Biome and TypeScript:
    ```bash
    bun run lint
    bun run typecheck
    ```
  - Python backend code must include type hints and pass test suites:
    ```bash
    pytest backend/tests
    ```

---

## Submitting Pull Requests

1. Create a descriptive feature branch (`git checkout -b feat/my-feature`).
2. Write clean, focused commits adhering to the Conventional Commits specification (`feat:`, `fix:`, `docs:`, `perf:`).
3. Ensure all tests and type checks pass locally before opening a pull request.
4. Open your PR against the primary branch on [MasterZ1311/Rheo](https://github.com/MasterZ1311/Rheo).
5. Provide a clear description of the problem solved, changes introduced, and testing steps conducted.

---

## Maintainer Contact

For questions regarding engineering direction or architectural proposals, reach out via:
- **GitHub Issues & Discussions:** [MasterZ1311/Rheo](https://github.com/MasterZ1311/Rheo)
- **Maintainer:** [MasterZ1311](https://github.com/MasterZ1311) (`thenappanmasterz1311@gmail.com`)

---

© 2026 MasterZ1311 · Rheo — Sovereign Local-First AI Voice Studio
