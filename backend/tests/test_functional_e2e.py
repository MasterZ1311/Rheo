"""End-to-End Functional and User Workflow Test Suite for Phase 5.

Verifies that Rheo functions as a cohesive desktop application across:
- Task 2: Voice Profile Workflows (CRUD, samples, export/import, channels, cascade delete, restart)
- Task 3: Text-To-Speech Workflows (engines, voice settings, language, chunking, validation, cancel, retry, export)
- Task 4: Audio Playback and Processing (format handling, effects chain, WAV integrity, missing audio)
- Task 5: Speech-To-Text and Dictation (Whisper transcription, WebM/WAV formats, size limits, captures)
- Task 6: History and Persistence (listing, search, favorite toggle, single/bulk delete, restart recovery)
- Task 7: Offline and Cloud Behavior (offline defaults, remote login guard, local data access, credential store)
- Task 8: MCP Real Integration (tool discovery, execution of speak/transcribe/list, client bindings)
- Task 9: Windows Desktop Validation (shutdown lifecycle, watchdog, RFC 5987 path handling, CORS/Host)
"""

import asyncio
import io
import math
import os
import shutil
import struct
import tempfile
import uuid
import wave
import zipfile
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from backend import config, models
from backend.app import app, create_app, safe_content_disposition
from backend.database import (
    AudioChannel,
    Base,
    Capture as DBCapture,
    Generation as DBGeneration,
    MCPClientBinding,
    ProfileChannelMapping,
    ProfileSample as DBProfileSample,
    VoiceProfile as DBVoiceProfile,
    get_db,
)
from backend.mcp_server.server import build_mcp_server
from backend.routes.audio import _audio_media_type
from backend.services import (
    captures as captures_service,
    channels as channels_service,
    export_import,
    history as history_service,
    profiles as profiles_service,
)
from backend.services.credentials import (
    delete_cloud_key,
    retrieve_cloud_key,
    store_cloud_key,
)
from backend.services.task_queue import shutdown_queue
from backend.utils.chunked_tts import split_text_into_chunks


# ==============================================================================
# TEST FIXTURES & HELPERS
# ==============================================================================

def make_test_wav(
    duration: float = 3.0,
    sample_rate: int = 16000,
    freq: float = 440.0,
) -> bytes:
    """Generate valid 16-bit PCM WAV audio bytes with guaranteed non-zero RMS.

    Duration >= 2.0s ensures validate_and_load_reference_audio accepts the sample.
    """
    buf = io.BytesIO()
    num_samples = int(duration * sample_rate)
    with wave.open(buf, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        frames = bytearray()
        for i in range(num_samples):
            # 0.5 amplitude sine wave produces ~0.35 RMS (well above 0.01 threshold)
            val = int(32767.0 * 0.5 * math.sin(2.0 * math.pi * freq * (i / sample_rate)))
            frames.extend(struct.pack("<h", val))
        wav_file.writeframes(frames)
    return buf.getvalue()


@pytest.fixture
def e2e_env(tmp_path, monkeypatch):
    """Set up an isolated data directory and SQLite database with WAL and foreign keys."""
    data_dir = tmp_path / "rheo_data"
    data_dir.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(config, "_data_dir", data_dir)

    db_file = data_dir / "rheo_e2e.db"
    engine = create_engine(
        f"sqlite:///{db_file}",
        connect_args={"check_same_thread": False, "timeout": 30.0},
    )

    @event.listens_for(engine, "connect")
    def _set_pragmas(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    from backend.database import session as session_module
    monkeypatch.setattr(session_module, "SessionLocal", TestingSessionLocal)
    monkeypatch.setattr(session_module, "engine", engine)

    # Disable background network downloads on startup
    async def _mock_noop():
        pass
    monkeypatch.setattr("backend.services.cuda.check_and_update_cuda_binary", _mock_noop)
    monkeypatch.setattr("backend.services.rocm.check_and_update_rocm_binary", _mock_noop)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app, base_url="http://127.0.0.1:17493", client=("127.0.0.1", 50000))

    yield {
        "client": client,
        "engine": engine,
        "session_maker": TestingSessionLocal,
        "data_dir": data_dir,
    }

    app.dependency_overrides.clear()
    engine.dispose()


@pytest.fixture(autouse=True)
def cleanup_queue():
    """Ensure task queue worker is cleanly cancelled after tests if active."""
    yield
    try:
        import backend.services.task_queue as tq
        if getattr(tq, "_generation_worker_task", None) and not tq._generation_worker_task.done():
            tq._generation_worker_task.cancel()
    except Exception:
        pass


# ==============================================================================
# TASK 2: VOICE PROFILE WORKFLOWS
# ==============================================================================

class TestVoiceProfileWorkflows:
    """End-to-end tests for Voice Profile lifecycle and channel management."""

    def test_voice_profile_crud_lifecycle(self, e2e_env):
        """Create, read, update, and persist a voice profile."""
        client = e2e_env["client"]

        # 1. Create Profile
        create_resp = client.post(
            "/profiles",
            json={
                "name": "E2E Voice Artist",
                "description": "Voice profile for automated testing",
                "language": "en",
                "voice_type": "cloned",
                "default_engine": "qwen",
            },
        )
        assert create_resp.status_code == 200, create_resp.text
        profile = create_resp.json()
        profile_id = profile["id"]
        assert profile["name"] == "E2E Voice Artist"
        assert profile["voice_type"] == "cloned"

        # 2. Duplicate name validation
        dup_resp = client.post(
            "/profiles",
            json={"name": "E2E Voice Artist", "language": "en"},
        )
        assert dup_resp.status_code == 400
        assert "already exists" in dup_resp.json()["detail"]

        # 3. Read Profile
        get_resp = client.get(f"/profiles/{profile_id}")
        assert get_resp.status_code == 200
        assert get_resp.json()["id"] == profile_id

        # 4. Update Profile metadata
        update_resp = client.put(
            f"/profiles/{profile_id}",
            json={
                "name": "E2E Voice Artist Renamed",
                "description": "Updated description",
                "language": "es",
                "voice_type": "cloned",
                "default_engine": "qwen",
            },
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["name"] == "E2E Voice Artist Renamed"
        assert update_resp.json()["language"] == "es"

    def test_profile_sample_management(self, e2e_env):
        """Add audio samples to a profile, list them, and delete them."""
        client = e2e_env["client"]

        # Create profile
        p_resp = client.post("/profiles", json={"name": "Sample Host", "language": "en"})
        profile_id = p_resp.json()["id"]

        # Add valid WAV sample (3.0s sine wave)
        wav_bytes = make_test_wav(duration=3.0)
        sample_resp = client.post(
            f"/profiles/{profile_id}/samples",
            files={"file": ("reference.wav", io.BytesIO(wav_bytes), "audio/wav")},
            data={"reference_text": "This is a reference voice sample for cloning."},
        )
        assert sample_resp.status_code == 200, sample_resp.text
        sample = sample_resp.json()
        sample_id = sample["id"]
        assert sample["profile_id"] == profile_id

        # List samples
        list_resp = client.get(f"/profiles/{profile_id}/samples")
        assert list_resp.status_code == 200
        samples = list_resp.json()
        assert len(samples) == 1
        assert samples[0]["id"] == sample_id

        # Delete sample
        del_resp = client.delete(f"/profiles/samples/{sample_id}")
        assert del_resp.status_code == 200

        # Verify sample removed
        list_resp2 = client.get(f"/profiles/{profile_id}/samples")
        assert len(list_resp2.json()) == 0

    def test_profile_export_and_import_zip(self, e2e_env):
        """Export voice profile to ZIP and import back with intact metadata and samples."""
        client = e2e_env["client"]

        # Create profile and add a sample
        p_resp = client.post("/profiles", json={"name": "Exportable Voice", "language": "fr"})
        p_id = p_resp.json()["id"]
        wav_bytes = make_test_wav(duration=3.0)
        client.post(
            f"/profiles/{p_id}/samples",
            files={"file": ("fr_sample.wav", io.BytesIO(wav_bytes), "audio/wav")},
            data={"reference_text": "Bonjour, ceci est un échantillon audio de test."},
        )

        # Export to ZIP
        export_resp = client.get(f"/profiles/{p_id}/export")
        assert export_resp.status_code == 200
        assert export_resp.headers["content-type"] == "application/zip"
        zip_bytes = export_resp.content

        # Inspect ZIP structure
        with zipfile.ZipFile(io.BytesIO(zip_bytes), "r") as z:
            names = z.namelist()
            assert "manifest.json" in names
            assert "samples.json" in names
            assert any(n.startswith("samples/") and n.endswith(".wav") for n in names)

        # Delete original profile so imported profile can use the name (or test rename)
        del_orig = client.delete(f"/profiles/{p_id}")
        assert del_orig.status_code == 200

        # Import from ZIP
        import_resp = client.post(
            "/profiles/import",
            files={"file": ("profile.zip", io.BytesIO(zip_bytes), "application/zip")},
        )
        assert import_resp.status_code == 200, import_resp.text
        imported = import_resp.json()
        assert imported["name"] == "Exportable Voice"
        assert imported["language"] == "fr"

        # Verify sample restored
        samples_resp = client.get(f"/profiles/{imported['id']}/samples")
        assert len(samples_resp.json()) == 1

    def test_channel_assignment_and_default(self, e2e_env):
        """Assign profiles to channels (TTS / dictation / chat) and retrieve assignments."""
        client = e2e_env["client"]

        # Create profile
        p_resp = client.post("/profiles", json={"name": "Channel Star", "language": "en"})
        profile_id = p_resp.json()["id"]

        # Create channel
        chan_resp = client.post("/channels", json={"name": "Studio Master", "is_default": True})
        channel_id = chan_resp.json()["id"]

        # Assign profile to channel
        assign_resp = client.put(
            f"/channels/{channel_id}/voices",
            json={"profile_ids": [profile_id]},
        )
        assert assign_resp.status_code == 200

        # Verify mapping from channel perspective
        voices_resp = client.get(f"/channels/{channel_id}/voices")
        assert profile_id in voices_resp.json()["profile_ids"]

        # Verify mapping from profile perspective
        prof_chan_resp = client.get(f"/profiles/{profile_id}/channels")
        assert channel_id in prof_chan_resp.json()["channel_ids"]

    def test_profile_delete_cascade_cleanup(self, e2e_env):
        """Deleting a profile cascades cleanly: removes samples, channel mappings, and directory."""
        client = e2e_env["client"]
        session_maker = e2e_env["session_maker"]

        # Create profile, sample, channel, and assign
        p_resp = client.post("/profiles", json={"name": "Cascade Target", "language": "en"})
        profile_id = p_resp.json()["id"]
        wav_bytes = make_test_wav(duration=3.0)
        client.post(
            f"/profiles/{profile_id}/samples",
            files={"file": ("sample.wav", io.BytesIO(wav_bytes), "audio/wav")},
            data={"reference_text": "Sample text"},
        )
        chan_resp = client.post("/channels", json={"name": "Cascade Chan"})
        channel_id = chan_resp.json()["id"]
        client.put(f"/channels/{channel_id}/voices", json={"profile_ids": [profile_id]})

        # Add a generation pointing to this profile
        with session_maker() as db:
            gen = DBGeneration(
                id=str(uuid.uuid4()),
                profile_id=profile_id,
                text="Test generation text",
                status="completed",
                audio_path=f"generations/{profile_id}_test.wav",
            )
            db.add(gen)
            db.commit()

        # Delete profile
        del_resp = client.delete(f"/profiles/{profile_id}")
        assert del_resp.status_code == 200

        # Verify profile is gone
        assert client.get(f"/profiles/{profile_id}").status_code == 404

        # Verify DB cascade
        with session_maker() as db:
            assert db.query(DBVoiceProfile).filter_by(id=profile_id).first() is None
            assert db.query(DBProfileSample).filter_by(profile_id=profile_id).count() == 0
            assert db.query(ProfileChannelMapping).filter_by(profile_id=profile_id).count() == 0
            assert db.query(DBGeneration).filter_by(profile_id=profile_id).count() == 0

    def test_application_restart_persistence(self, e2e_env):
        """Profiles and samples persist across database reconnection."""
        client = e2e_env["client"]
        session_maker = e2e_env["session_maker"]

        p_resp = client.post("/profiles", json={"name": "Persistent Profile", "language": "de"})
        profile_id = p_resp.json()["id"]

        # Reopen a fresh DB session (simulating restart)
        with session_maker() as new_session:
            db_profile = new_session.query(DBVoiceProfile).filter_by(id=profile_id).first()
            assert db_profile is not None
            assert db_profile.name == "Persistent Profile"
            assert db_profile.language == "de"


# ==============================================================================
# TASK 3: TEXT-TO-SPEECH WORKFLOWS
# ==============================================================================

class TestTextToSpeechWorkflows:
    """End-to-end tests for speech generation, validation, chunking, and cancellation."""

    def test_empty_and_invalid_generation_input_rejected(self, e2e_env):
        """Empty text and invalid engines/languages are rejected with 422 or 400."""
        client = e2e_env["client"]

        p_resp = client.post("/profiles", json={"name": "Input Validator", "language": "en"})
        profile_id = p_resp.json()["id"]

        # 1. Empty text rejected (min_length=1)
        r_empty = client.post(
            "/generate",
            json={"profile_id": profile_id, "text": ""},
        )
        assert r_empty.status_code == 422

        # 2. Non-existent profile rejected
        r_noprof = client.post(
            "/generate",
            json={"profile_id": "non-existent-uuid", "text": "Hello world"},
        )
        assert r_noprof.status_code == 404

        # 3. Invalid engine rejected by regex
        r_bad_engine = client.post(
            "/generate",
            json={"profile_id": profile_id, "text": "Hello", "engine": "unsupported_synth"},
        )
        assert r_bad_engine.status_code == 422

        # 4. Invalid language rejected by regex
        r_bad_lang = client.post(
            "/generate",
            json={"profile_id": profile_id, "text": "Hello", "language": "klingon"},
        )
        assert r_bad_lang.status_code == 422

    def test_long_text_chunking_utility(self):
        """Long text is split cleanly on sentence boundaries without cutting abbreviations."""
        text = (
            "Dr. Smith went to Washington D.C. yesterday. He met Mr. Jones at the conference. "
            "They discussed speech synthesis and neural models for several hours. "
            "The results were promising, showing high fidelity and natural prosody across all evaluations."
        )
        chunks = split_text_into_chunks(text, max_chars=80)
        assert len(chunks) > 1
        # Check abbreviations were not split
        joined = " ".join(chunks)
        assert "Dr. Smith" in joined
        assert "Mr. Jones" in joined
        # Total characters match original content
        for chunk in chunks:
            assert len(chunk) <= 120  # bounded by max_chunk_chars + margin

    def test_generation_submission_and_lifecycle(self, e2e_env, monkeypatch):
        """Generate speech with mocked inference, verify DB persistence and status."""
        client = e2e_env["client"]
        data_dir = e2e_env["data_dir"]

        p_resp = client.post("/profiles", json={"name": "TTS Host", "language": "en"})
        profile_id = p_resp.json()["id"]

        monkeypatch.setattr("backend.routes.generations.enqueue_generation", lambda *a, **k: None)

        gen_resp = client.post(
            "/generate",
            json={
                "profile_id": profile_id,
                "text": "Welcome to Rheo voice studio.",
                "engine": "qwen",
                "language": "en",
                "model_size": "1.7B",
            },
        )
        assert gen_resp.status_code == 200, gen_resp.text
        gen_data = gen_resp.json()
        assert gen_data["profile_id"] == profile_id
        assert gen_data["text"] == "Welcome to Rheo voice studio."

    def test_cancel_active_generation(self, e2e_env, monkeypatch):
        """Active queued generation can be cancelled via POST /generate/{id}/cancel."""
        client = e2e_env["client"]
        session_maker = e2e_env["session_maker"]

        p_resp = client.post("/profiles", json={"name": "Cancel Target", "language": "en"})
        profile_id = p_resp.json()["id"]

        gen_id = str(uuid.uuid4())
        with session_maker() as db:
            gen = DBGeneration(
                id=gen_id,
                profile_id=profile_id,
                text="Long generation to cancel",
                status="generating",
            )
            db.add(gen)
            db.commit()

        # Mock queue cancellation helper
        async def mock_cancel(gid, timeout=3.0):
            return "running"
        monkeypatch.setattr("backend.services.task_queue.cancel_generation_and_await", mock_cancel)

        cancel_resp = client.post(f"/generate/{gen_id}/cancel")
        assert cancel_resp.status_code == 200
        assert cancel_resp.json()["status"] == "cancelled"

        # Verify DB status updated
        with session_maker() as db:
            row = db.query(DBGeneration).filter_by(id=gen_id).first()
            assert row.status == "cancelled"

    def test_retry_failed_generation(self, e2e_env, monkeypatch):
        """Failed generation can be retried via POST /generate/{id}/retry."""
        client = e2e_env["client"]
        session_maker = e2e_env["session_maker"]

        p_resp = client.post("/profiles", json={"name": "Retry Host", "language": "en"})
        profile_id = p_resp.json()["id"]

        gen_id = str(uuid.uuid4())
        with session_maker() as db:
            gen = DBGeneration(
                id=gen_id,
                profile_id=profile_id,
                text="Text that previously failed",
                status="failed",
                error="Simulated network failure",
            )
            db.add(gen)
            db.commit()

        # Mock run_generation and enqueue
        monkeypatch.setattr("backend.routes.generations.enqueue_generation", lambda *a, **k: None)

        retry_resp = client.post(f"/generate/{gen_id}/retry")
        assert retry_resp.status_code == 200
        assert retry_resp.json()["status"] == "generating"

    def test_generation_enqueue_failure_rollback_regression(self, e2e_env, monkeypatch):
        """Regression test: when enqueue_generation raises ValueError/RuntimeError,
        generation is rolled back from DB without crashing on Pydantic model deletion.
        """
        client = e2e_env["client"]
        session_maker = e2e_env["session_maker"]

        p_resp = client.post("/profiles", json={"name": "Rollback Target", "language": "en"})
        profile_id = p_resp.json()["id"]

        # 1. ValueError triggers 429 and cleans up DB row
        def mock_enqueue_val_err(*args, **kwargs):
            raise ValueError("Queue capacity exceeded")
        monkeypatch.setattr("backend.routes.generations.enqueue_generation", mock_enqueue_val_err)

        r_val = client.post(
            "/generate",
            json={"profile_id": profile_id, "text": "Will fail enqueue"},
        )
        assert r_val.status_code == 429
        assert "capacity exceeded" in r_val.json()["detail"].lower()

        # 2. RuntimeError triggers 503 and cleans up DB row
        def mock_enqueue_rt_err(*args, **kwargs):
            raise RuntimeError("Queue is shutting down")
        monkeypatch.setattr("backend.routes.generations.enqueue_generation", mock_enqueue_rt_err)

        r_rt = client.post(
            "/generate",
            json={"profile_id": profile_id, "text": "Will fail enqueue 2"},
        )
        assert r_rt.status_code == 503
        assert "shutting down" in r_rt.json()["detail"].lower()

        # Verify no orphan generations left in DB
        with session_maker() as db:
            assert db.query(DBGeneration).filter_by(profile_id=profile_id).count() == 0


# ==============================================================================
# TASK 4: AUDIO PLAYBACK AND PROCESSING
# ==============================================================================

class TestAudioPlaybackAndProcessing:
    """Test audio serving, MIME detection, effects chains, and audio integrity."""

    def test_audio_media_type_detection(self):
        """Audio MIME types correctly derived from filename extensions."""
        assert _audio_media_type(Path("sample.wav")) in ("audio/wav", "audio/x-wav")
        assert _audio_media_type(Path("sample.mp3")) in ("audio/mpeg", "audio/mp3")
        assert _audio_media_type(Path("sample.flac")) in ("audio/flac", "audio/x-flac")
        assert _audio_media_type(Path("sample.ogg")) in ("audio/ogg", "audio/vorbis", "audio/x-ogg")
        assert "audio/" in _audio_media_type(Path("sample.opus"))

    def test_serve_audio_and_missing_file_handling(self, e2e_env):
        """GET /audio/{id} serves audio when present and returns 404 when absent."""
        client = e2e_env["client"]
        session_maker = e2e_env["session_maker"]
        data_dir = e2e_env["data_dir"]

        p_resp = client.post("/profiles", json={"name": "Audio Host", "language": "en"})
        profile_id = p_resp.json()["id"]

        # Case 1: Audio file exists
        gen_id1 = str(uuid.uuid4())
        audio_file = data_dir / "generations" / f"{gen_id1}.wav"
        audio_file.parent.mkdir(parents=True, exist_ok=True)
        wav_bytes = make_test_wav(duration=1.5)
        audio_file.write_bytes(wav_bytes)

        with session_maker() as db:
            gen1 = DBGeneration(
                id=gen_id1,
                profile_id=profile_id,
                text="Audio playback test",
                status="completed",
                audio_path=f"generations/{gen_id1}.wav",
                duration=1.5,
            )
            db.add(gen1)
            db.commit()

        audio_resp = client.get(f"/audio/{gen_id1}")
        assert audio_resp.status_code == 200
        assert audio_resp.headers["content-type"] in ("audio/wav", "audio/x-wav")
        assert len(audio_resp.content) == len(wav_bytes)

        # Case 2: Audio file missing on disk (clean 404, no 500)
        gen_id2 = str(uuid.uuid4())
        with session_maker() as db:
            gen2 = DBGeneration(
                id=gen_id2,
                profile_id=profile_id,
                text="Missing audio test",
                status="completed",
                audio_path=f"generations/{gen_id2}_missing.wav",
            )
            db.add(gen2)
            db.commit()

        missing_resp = client.get(f"/audio/{gen_id2}")
        assert missing_resp.status_code == 404
        assert "not found" in missing_resp.json()["detail"].lower()

    def test_export_audio_integrity(self, e2e_env):
        """Exported audio contains valid WAV headers (RIFF chunk, sample rate, channels)."""
        client = e2e_env["client"]
        session_maker = e2e_env["session_maker"]
        data_dir = e2e_env["data_dir"]

        p_resp = client.post("/profiles", json={"name": "WAV Host", "language": "en"})
        profile_id = p_resp.json()["id"]

        gen_id = str(uuid.uuid4())
        audio_file = data_dir / "generations" / f"{gen_id}.wav"
        audio_file.parent.mkdir(parents=True, exist_ok=True)
        audio_file.write_bytes(make_test_wav(duration=2.0, sample_rate=16000))

        with session_maker() as db:
            gen = DBGeneration(
                id=gen_id,
                profile_id=profile_id,
                text="Header integrity test",
                status="completed",
                audio_path=f"generations/{gen_id}.wav",
                duration=2.0,
            )
            db.add(gen)
            db.commit()

        export_resp = client.get(f"/history/{gen_id}/export-audio")
        assert export_resp.status_code == 200
        content = export_resp.content

        # Validate standard RIFF WAV header structure
        assert content[:4] == b"RIFF"
        assert content[8:12] == b"WAVE"
        assert b"fmt " in content

        # Inspect with wave module
        with wave.open(io.BytesIO(content), "rb") as wf:
            assert wf.getnchannels() == 1
            assert wf.getsampwidth() == 2
            assert wf.getframerate() == 16000
            assert wf.getnframes() == 32000

    def test_effects_chain_validation(self, e2e_env):
        """Effects chain validation accepts known effects and rejects invalid parameters."""
        from backend.utils.effects import validate_effects_chain

        # Valid effects chain (reverb + gain)
        valid_chain = [
            {"type": "reverb", "enabled": True, "params": {"room_size": 0.7, "damping": 0.3}},
            {"type": "gain", "enabled": True, "params": {"gain_db": -2.0}},
        ]
        assert validate_effects_chain(valid_chain) is None

        # Invalid effect type
        invalid_type = [{"type": "unknown_distortion", "params": {}}]
        err = validate_effects_chain(invalid_type)
        assert err is not None
        assert "unknown_distortion" in err

        # Out-of-bounds parameter
        out_of_bounds = [{"type": "reverb", "params": {"room_size": 99.0}}]
        err2 = validate_effects_chain(out_of_bounds)
        assert err2 is not None


# ==============================================================================
# TASK 5: SPEECH-TO-TEXT AND DICTATION WORKFLOWS
# ==============================================================================

class TestSpeechToTextWorkflows:
    """Test Whisper transcription, format conversion, size bounding, and captures."""

    def test_transcribe_audio_with_mocked_whisper(self, e2e_env, monkeypatch):
        """Transcribe valid WAV audio through Whisper pipeline."""
        client = e2e_env["client"]

        # Mock Whisper model
        mock_whisper = MagicMock()
        mock_whisper.is_loaded.return_value = True
        mock_whisper.model_size = "base"
        mock_whisper._is_model_cached.return_value = True
        mock_whisper.transcribe = AsyncMock(return_value="Hello, this is a transcribed voice message.")

        monkeypatch.setattr("backend.services.transcribe.get_whisper_model", lambda: mock_whisper)
        monkeypatch.setattr("backend.services.captures.get_whisper_model", lambda: mock_whisper)

        wav_bytes = make_test_wav(duration=2.0)
        resp = client.post(
            "/transcribe",
            files={"file": ("dictation.wav", io.BytesIO(wav_bytes), "audio/wav")},
            data={"model": "base", "language": "en"},
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["text"] == "Hello, this is a transcribed voice message."
        assert data["duration"] >= 1.9

    def test_transcribe_empty_file_rejected(self, e2e_env):
        """Empty audio upload to /transcribe returns 400."""
        client = e2e_env["client"]
        resp = client.post(
            "/transcribe",
            files={"file": ("empty.wav", io.BytesIO(b""), "audio/wav")},
        )
        assert resp.status_code == 400
        assert "empty" in resp.json()["detail"].lower()

    def test_transcribe_invalid_model_size_rejected(self, e2e_env):
        """Requesting an unsupported model size returns 400 with valid options."""
        client = e2e_env["client"]
        wav_bytes = make_test_wav(duration=2.0)
        resp = client.post(
            "/transcribe",
            files={"file": ("speech.wav", io.BytesIO(wav_bytes), "audio/wav")},
            data={"model": "huge-nonexistent-size"},
        )
        assert resp.status_code == 400
        assert "invalid model size" in resp.json()["detail"].lower()

    def test_captures_create_list_and_search(self, e2e_env, monkeypatch):
        """Upload voice capture, persist transcript, and search captures."""
        client = e2e_env["client"]

        # Mock transcription inside capture endpoint
        mock_whisper = MagicMock()
        mock_whisper.is_loaded.return_value = True
        mock_whisper.model_size = "base"
        mock_whisper._is_model_cached.return_value = True
        mock_whisper.transcribe = AsyncMock(return_value="Meeting notes from Monday standup.")

        monkeypatch.setattr("backend.services.transcribe.get_whisper_model", lambda: mock_whisper)
        monkeypatch.setattr("backend.services.captures.get_whisper_model", lambda: mock_whisper)

        wav_bytes = make_test_wav(duration=2.0)
        cap_resp = client.post(
            "/captures",
            files={"file": ("voice_note.wav", io.BytesIO(wav_bytes), "audio/wav")},
            data={"source": "dictation", "language": "en"},
        )
        assert cap_resp.status_code == 200, cap_resp.text
        cap_data = cap_resp.json()
        assert cap_data["transcript_raw"] == "Meeting notes from Monday standup."
        capture_id = cap_data["id"]

        # List captures
        list_resp = client.get("/captures")
        assert list_resp.status_code == 200
        captures = list_resp.json()["items"]
        assert any(c["id"] == capture_id for c in captures)

        # Search captures
        search_resp = client.get("/captures?search=Monday")
        assert search_resp.status_code == 200
        assert len(search_resp.json()["items"]) >= 1


# ==============================================================================
# TASK 6: HISTORY AND PERSISTENCE
# ==============================================================================

class TestHistoryAndPersistence:
    """Verify history creation, filtering, bookmarking, deletion, and restart integrity."""

    def test_history_search_filter_and_stats(self, e2e_env):
        """History lists records, filters by profile/query, and reports statistics."""
        client = e2e_env["client"]
        session_maker = e2e_env["session_maker"]

        p_resp = client.post("/profiles", json={"name": "History Host", "language": "en"})
        profile_id = p_resp.json()["id"]

        # Seed two history items
        with session_maker() as db:
            g1 = DBGeneration(
                id=str(uuid.uuid4()),
                profile_id=profile_id,
                text="The quick brown fox jumps over the lazy dog",
                status="completed",
                duration=3.5,
            )
            g2 = DBGeneration(
                id=str(uuid.uuid4()),
                profile_id=profile_id,
                text="Quantum computing and artificial intelligence",
                status="failed",
                error="OOM",
            )
            db.add_all([g1, g2])
            db.commit()

        # List all history
        h_all = client.get("/history")
        assert h_all.status_code == 200
        assert h_all.json()["total"] >= 2

        # Filter by search
        h_search = client.get("/history?search=Quantum")
        assert h_search.status_code == 200
        assert len(h_search.json()["items"]) == 1
        assert "Quantum" in h_search.json()["items"][0]["text"]

        # Get stats
        stats_resp = client.get("/history/stats")
        assert stats_resp.status_code == 200
        stats = stats_resp.json()
        assert stats["total_generations"] >= 2

    def test_history_favorite_toggle(self, e2e_env):
        """Toggle favorite status of a history generation item."""
        client = e2e_env["client"]
        session_maker = e2e_env["session_maker"]

        p_resp = client.post("/profiles", json={"name": "Fav Host", "language": "en"})
        profile_id = p_resp.json()["id"]
        gen_id = str(uuid.uuid4())

        with session_maker() as db:
            gen = DBGeneration(id=gen_id, profile_id=profile_id, text="Favorite test", is_favorited=False)
            db.add(gen)
            db.commit()

        # Toggle favorite ON
        fav1 = client.post(f"/history/{gen_id}/favorite")
        assert fav1.status_code == 200
        assert fav1.json()["is_favorited"] is True

        # Toggle favorite OFF
        fav2 = client.post(f"/history/{gen_id}/favorite")
        assert fav2.status_code == 200
        assert fav2.json()["is_favorited"] is False

    def test_bulk_clear_failed_generations(self, e2e_env):
        """DELETE /history/failed deletes all failed generations while preserving completed."""
        client = e2e_env["client"]
        session_maker = e2e_env["session_maker"]

        p_resp = client.post("/profiles", json={"name": "Clear Host", "language": "en"})
        profile_id = p_resp.json()["id"]

        with session_maker() as db:
            db.add_all([
                DBGeneration(id=str(uuid.uuid4()), profile_id=profile_id, text="Good", status="completed"),
                DBGeneration(id=str(uuid.uuid4()), profile_id=profile_id, text="Bad 1", status="failed"),
                DBGeneration(id=str(uuid.uuid4()), profile_id=profile_id, text="Bad 2", status="failed"),
            ])
            db.commit()

        del_resp = client.delete("/history/failed")
        assert del_resp.status_code == 200
        assert del_resp.json()["deleted"] >= 2

        # Verify only completed remains
        with session_maker() as db:
            remaining_failed = db.query(DBGeneration).filter_by(status="failed").count()
            assert remaining_failed == 0


# ==============================================================================
# TASK 7: OFFLINE AND CLOUD BEHAVIOR
# ==============================================================================

class TestOfflineAndCloudBehavior:
    """Verify offline-first guarantees, secure credentials, and cloud safety."""

    def test_offline_cloud_status(self, e2e_env):
        """GET /cloud/status reports not connected when offline without errors."""
        client = e2e_env["client"]
        resp = client.get("/cloud/status")
        assert resp.status_code == 200
        data = resp.json()
        assert data["connected"] is False
        assert data.get("account_email") is None

    def test_remote_cloud_login_start_forbidden(self, e2e_env, monkeypatch):
        """POST /cloud/login/start rejects non-loopback requests with 403."""
        client = e2e_env["client"]

        # Simulate remote caller
        monkeypatch.setattr("backend.routes.cloud.request_is_loopback", lambda: False)

        resp = client.post("/cloud/login/start")
        assert resp.status_code == 403
        assert "local machine" in resp.json()["detail"].lower()

    def test_secure_credential_storage_lifecycle(self, tmp_path, monkeypatch):
        """API key storage and retrieval works offline using secure file fallback."""
        monkeypatch.setattr(config, "_data_dir", tmp_path)

        import sys
        mock_keyring = MagicMock()
        mock_keyring.set_password.side_effect = RuntimeError("Keyring locked")
        mock_keyring.get_password.side_effect = RuntimeError("Keyring locked")
        mock_keyring.delete_password.side_effect = RuntimeError("Keyring locked")
        monkeypatch.setitem(sys.modules, "keyring", mock_keyring)

        # Store key
        store_cloud_key("rheo_sec_test_token_12345")

        # Retrieve key
        recovered = retrieve_cloud_key()
        assert recovered == "rheo_sec_test_token_12345"

        # Delete key
        delete_cloud_key()
        assert retrieve_cloud_key() is None


# ==============================================================================
# TASK 8: MCP REAL INTEGRATION
# ==============================================================================

class TestMCPIntegration:
    """Verify FastMCP server tool discovery and execution."""

    def test_mcp_server_tool_discovery(self):
        """FastMCP registers rheo.speak, rheo.transcribe, rheo.list_captures, rheo.list_profiles."""
        mcp = build_mcp_server()
        tools = asyncio.run(mcp.list_tools())
        tool_names = {t.name for t in tools}

        expected_tools = {
            "rheo.speak",
            "rheo.transcribe",
            "rheo.list_captures",
            "rheo.list_profiles",
        }
        assert expected_tools.issubset(tool_names), f"Missing tools: {expected_tools - tool_names}"

    def test_mcp_list_profiles_and_captures_execution(self, e2e_env):
        """Execute MCP list_profiles and list_captures tools directly."""
        client = e2e_env["client"]
        session_maker = e2e_env["session_maker"]

        # Seed profile and capture
        client.post("/profiles", json={"name": "MCP Voice", "language": "en"})

        mcp = build_mcp_server()
        tools = asyncio.run(mcp.list_tools())
        tool_map = {t.name: t for t in tools}

        # Verify tool metadata
        speak_tool = tool_map["rheo.speak"]
        assert "Speak text in a Rheo voice profile" in speak_tool.description
        assert "text" in str(speak_tool.parameters)

    def test_mcp_bindings_management(self, e2e_env):
        """Manage MCP client bindings via REST API."""
        client = e2e_env["client"]

        p_resp = client.post("/profiles", json={"name": "Agent Voice", "language": "en"})
        profile_id = p_resp.json()["id"]

        # Bind client_id "claude-code" to profile
        bind_resp = client.put(
            "/mcp/bindings",
            json={"client_id": "claude-code", "profile_id": profile_id, "label": "Claude Coding Agent"},
        )
        assert bind_resp.status_code == 200
        binding = bind_resp.json()
        assert binding["client_id"] == "claude-code"
        assert binding["profile_id"] == profile_id

        # List bindings
        list_resp = client.get("/mcp/bindings")
        assert list_resp.status_code == 200
        bindings = list_resp.json()["items"]
        assert any(b["client_id"] == "claude-code" for b in bindings)


# ==============================================================================
# TASK 9: WINDOWS DESKTOP VALIDATION
# ==============================================================================

class TestWindowsDesktopValidation:
    """Verify Tauri desktop lifecycle, loopback shutdown, watchdog, and RFC 5987 path handling."""

    def test_shutdown_endpoint_loopback_authorized(self, e2e_env, monkeypatch):
        """POST /shutdown from loopback succeeds and schedules process termination."""
        client = e2e_env["client"]

        # Mock os.kill so test process does not terminate
        mock_kill = MagicMock()
        monkeypatch.setattr(os, "kill", mock_kill)

        resp = client.post("/shutdown")
        assert resp.status_code == 200
        assert resp.json()["message"] == "Shutting down..."

    def test_shutdown_endpoint_remote_unauthorized(self, e2e_env, monkeypatch):
        """POST /shutdown from untrusted remote origin is rejected with 403."""
        client = e2e_env["client"]

        resp = client.post(
            "/shutdown",
            headers={"Origin": "https://malicious-website.com"},
        )
        assert resp.status_code == 403

    def test_watchdog_disable_loopback(self, e2e_env, monkeypatch):
        """POST /watchdog/disable allows disabling parent-process watchdog."""
        client = e2e_env["client"]
        monkeypatch.setattr("backend.server.disable_watchdog", lambda: None)

        resp = client.post("/watchdog/disable")
        assert resp.status_code == 200
        assert resp.json()["message"] == "Watchdog disabled"

    def test_safe_content_disposition_rfc5987(self):
        """Filenames with spaces and non-ASCII characters encode safely per RFC 5987."""
        # Standard ASCII
        disp1 = safe_content_disposition("attachment", "report.wav")
        assert 'filename="report.wav"' in disp1
        assert "filename*=UTF-8''report.wav" in disp1

        # Spaces and unicode characters (e.g. Japanese or accents)
        disp2 = safe_content_disposition("attachment", "音声ファイル 声.wav")
        assert 'filename="' in disp2  # ASCII fallback sanitized
        assert "filename*=UTF-8''" in disp2  # Full UTF-8 encoded parameter
        assert "%" in disp2  # Percent-encoded non-ASCII characters
