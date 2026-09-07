# Rheo REST API Documentation

Welcome to the Rheo REST API reference. Rheo provides high-performance, local-first speech synthesis, voice cloning, speech-to-text transcription, local LLM refinement, and Model Context Protocol (MCP) agent tools.

---

## 1. Overview & Base URL

- **Default Local URL**: `http://127.0.0.1:17493`
- **Interactive Swagger UI**: `http://127.0.0.1:17493/docs`
- **ReDoc UI**: `http://127.0.0.1:17493/redoc`
- **OpenAPI 3.1 Specification**: [`docs/openapi.json`](openapi.json) or `http://127.0.0.1:17493/openapi.json`

### Authentication & Network Security

By default, Rheo runs locally on `127.0.0.1:17493` without authentication.
- **Localhost calls**: Permitted for zero-friction integration with desktop agents and scripts.
- **Loopback constraints**: File path resolution in transcription (`rheo.transcribe / rheo.transcribe`) is strictly restricted to loopback callers (`127.0.0.1` / `::1`).
- **Remote / Network deployment**: If binding to `0.0.0.0` or hosting in Docker/Cloud, place Rheo behind a reverse proxy (e.g. Caddy, NGINX) enforcing TLS and API Key authentication.

---

## 2. Core Endpoints Quick Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/generate` | Generate speech from text using a voice profile |
| `GET` | `/generate/{id}/status` | Check status of an asynchronous speech generation task |
| `POST` | `/speak` | High-level agent speech wrapper (supports name matching & client bindings) |
| `POST` | `/transcribe` | Transcribe an audio file using local OpenAI Whisper |
| `GET` | `/profiles` | List all available cloned, designed, and preset voice profiles |
| `POST` | `/profiles` | Create a new voice profile |
| `POST` | `/profiles/{id}/samples` | Upload reference audio sample for zero-shot voice cloning |
| `POST` | `/captures` | Upload microphone recording, run STT, and save to Captures |
| `POST` | `/captures/{id}/refine` | Clean up filler words and stutters via local Qwen3 LLM |
| `POST` | `/llm/generate` | Run single-turn text completion with bundled local LLM |
| `GET` | `/audio/{generation_id}` | Download/stream generated WAV audio |
| `GET` | `/health` | System health check (GPU acceleration, VRAM, model cache) |
| `POST` | `/mcp` | FastMCP Model Context Protocol endpoint for AI coding agents |

---

## 3. Detailed Endpoint Specifications

### 3.1 Speech Generation

#### `POST /generate`
Generate speech from text asynchronously. Returns immediately with a generation task ID.

**Request Body (`application/json`):**
```json
{
  "text": "Hello world! This is a test of Rheo sovereign AI speech synthesis.",
  "profile_id": "00000000-0000-0000-0000-000000000001",
  "language": "en",
  "engine": "qwen",
  "model_size": "1.7B",
  "temperature": 0.7,
  "crossfade_ms": 50,
  "max_chunk_chars": 1500,
  "personality": false
}
```

**Parameters:**
- `text` (*string*, required): Text to synthesize (1–50,000 characters).
- `profile_id` (*string*, required): UUID of the voice profile to speak in.
- `language` (*string*, optional): ISO language code (e.g. `en`, `es`, `zh`, `ja`, `fr`, `de`, `ko`). Default `en`.
- `engine` (*string*, optional): TTS engine to use. Choices: `qwen`, `qwen_custom_voice`, `luxtts`, `chatterbox`, `chatterbox_turbo`, `tada`, `kokoro`. Default `qwen`.
- `model_size` (*string*, optional): Engine size variant (e.g. `1.7B` or `0.6B`).
- `personality` (*boolean*, optional): If `true`, runs text through the profile's local LLM persona before synthesis.

**Response (`200 OK`):**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "generating",
  "message": "Speech generation started"
}
```

**cURL Example:**
```bash
curl -X POST http://127.0.0.1:17493/generate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "The sovereign open-source AI voice studio.",
    "profile_id": "YOUR_PROFILE_ID",
    "language": "en"
  }'
```

---

#### `GET /generate/{id}/status`
Poll the generation progress or subscribe via SSE (`/generate/stream`).

**Response (`200 OK`):**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "completed",
  "audio_url": "/audio/a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "duration": 3.42,
  "error": null
}
```

---

### 3.2 Agent Voice Output (`POST /speak`)

Designed for automated scripts, CLI tools, and non-MCP agents that want to speak in a cloned voice with simple human-readable names.

**Request Body (`application/json`):**
```json
{
  "text": "Deployment finished successfully. All tests passing.",
  "profile": "Morgan",
  "language": "en",
  "personality": true
}
```

**Header:**
- `X-Rheo-Client-Id (or legacy X-Rheo-Client-Id)` (*string*, optional): Identifies the caller (e.g. `claude-code`, `cursor`) to resolve per-client default voices configured in Settings.

**cURL Example:**
```bash
curl -X POST http://127.0.0.1:17493/speak \
  -H "Content-Type: application/json" \
  -H "X-Rheo-Client-Id (or legacy X-Rheo-Client-Id): my-script" \
  -d '{"text": "Build complete.", "profile": "Morgan"}'
```

---

### 3.3 Speech-to-Text & Captures

#### `POST /transcribe`
Transcribe an audio file using local Whisper models.

**Request (`multipart/form-data`):**
- `audio`: Audio file binary (`.wav`, `.mp3`, `.m4a`, `.ogg`, `.flac`).
- `model`: Whisper model variant (`whisper-turbo`, `base`, `small`, `medium`, `large`). Default `whisper-turbo`.
- `language`: Audio language code or `auto` for automatic detection.

**Response (`200 OK`):**
```json
{
  "text": "Good morning, team. Today we are launching the new release.",
  "duration": 4.12,
  "language": "en",
  "model": "whisper-turbo"
}
```

**cURL Example:**
```bash
curl -X POST http://127.0.0.1:17493/transcribe \
  -F "audio=@meeting_notes.wav" \
  -F "model=whisper-turbo"
```

---

#### `POST /captures/{id}/refine`
Run the local Qwen3 LLM on a raw transcript to clean up filler words ("um", "uh"), remove stuttered self-corrections, and format technical terms.

**Request Body (`application/json`):**
```json
{
  "flags": {
    "smart_cleanup": true,
    "self_correction": true,
    "preserve_technical": true
  },
  "model_size": "1.7B"
}
```

**Response (`200 OK`):**
```json
{
  "id": "c7d8e9f0-1234-5678-9abc-def012345678",
  "transcript_raw": "Um so basically we need to uh restart the pod, I mean the service.",
  "transcript_refined": "So basically we need to restart the service.",
  "llm_model": "1.7B"
}
```

---

### 3.4 Voice Profiles

#### `GET /profiles`
List all voice profiles.

**Response (`200 OK`):**
```json
[
  {
    "id": "00000000-0000-0000-0000-000000000001",
    "name": "Morgan",
    "description": "Calm narrator voice",
    "language": "en",
    "voice_type": "cloned",
    "sample_count": 3,
    "personality": "A thoughtful engineering lead who speaks calmly and directly.",
    "created_at": "2026-04-01T12:00:00Z"
  }
]
```

#### `POST /profiles`
Create a new voice profile container.

**Request Body (`application/json`):**
```json
{
  "name": "Alex",
  "description": "Crisp technical presenter",
  "language": "en"
}
```

#### `POST /profiles/{id}/samples`
Upload a reference WAV file (5–30 seconds recommended) to provide reference acoustic features for zero-shot cloning.

**Request (`multipart/form-data`):**
- `file`: Audio file (`.wav` format, 16kHz–48kHz).
- `reference_text` (*string*, optional): Exact verbatim transcript of the audio for superior acoustic alignment.

---

### 3.5 System Health & Hardware Status

#### `GET /health`
Get GPU acceleration status, VRAM allocation, and model cache status.

**Response (`200 OK`):**
```json
{
  "status": "ok",
  "version": "0.5.0",
  "gpu": "CUDA (NVIDIA GeForce RTX 4090)",
  "vram_used_mb": 2450.5,
  "vram_total_mb": 24576.0,
  "models_loaded": {
    "tts": "qwen3-1.7B",
    "llm": "qwen3-0.6B",
    "stt": "whisper-turbo"
  }
}
```

---

## 4. Model Context Protocol (MCP) Integration

Rheo hosts a Streamable HTTP Model Context Protocol endpoint at `/mcp`.

### Configuration in AI Agents

#### Claude Code:
```bash
claude mcp add rheo \
  --transport http \
  --url http://127.0.0.1:17493/mcp \
  --header "X-Rheo-Client-Id (or legacy X-Rheo-Client-Id): claude-code"
```

#### Cursor / Windsurf / VS Code (`mcpServers` config):
```json
{
  "mcpServers": {
    "rheo": {
      "url": "http://127.0.0.1:17493/mcp",
      "headers": {
        "X-Rheo-Client-Id (or legacy X-Rheo-Client-Id)": "cursor"
      }
    }
  }
}
```

### Available MCP Tools

1. `rheo.speak / rheo.speak`
   - Arguments: `text` (*string*), `profile` (*optional string*), `personality` (*optional boolean*), `model_size` (*optional string*).
   - Causes the host machine to speak in the chosen cloned voice with an on-screen visual indicator.
2. `rheo.transcribe / rheo.transcribe`
   - Arguments: `audio_data` (*optional base64*) or `audio_path` (*optional local file path, loopback only*), `model` (*optional string*).
   - Transcribes audio into text.
3. `rheo.list_profiles`
   - Returns all available voices.
4. `rheo.list_captures`
   - Returns recent dictation and microphone captures with transcripts.
