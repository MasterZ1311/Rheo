"""
Captures service — persists raw audio alongside its STT transcript and,
optionally, an LLM-refined version.

A capture is a single voice input event (dictation, long-form recording, or
uploaded file). Storage mirrors the generations flow: audio lives under
``data/captures/<id>.wav`` and rows live in the ``captures`` table.
"""

from datetime import datetime, timedelta
import contextlib
import json
import logging
import uuid
from pathlib import Path
from typing import Optional, Any

import soundfile as sf
from sqlalchemy.orm import Session

from .. import config
from ..database import Capture as DBCapture
from ..models import CaptureResponse, RefinementFlagsModel
from ..utils.audio import load_audio
from .dictionary import apply_custom_words_correction
from .refinement import RefinementFlags, refine_transcript, remove_filler_words_rule
from .settings import get_capture_settings
from .transcribe import get_whisper_model

logger = logging.getLogger(__name__)


VALID_SOURCES = {"dictation", "recording", "file"}
# Suffixes whisper's miniaudio loader can read directly. Anything outside
# this set has to go through librosa for decode + a soundfile transcode
# before whisper sees it.
WHISPER_NATIVE_FORMATS = (".wav", ".mp3", ".flac", ".ogg")


def _to_response(row: DBCapture) -> CaptureResponse:
    flags_model: Optional[RefinementFlagsModel] = None
    if row.refinement_flags:
        try:
            flags_model = RefinementFlagsModel(**json.loads(row.refinement_flags))
        except (ValueError, TypeError):
            flags_model = None

    return CaptureResponse(
        id=row.id,
        audio_path=row.audio_path,
        source=row.source,
        language=row.language,
        duration_ms=row.duration_ms,
        transcript_raw=row.transcript_raw or "",
        transcript_refined=row.transcript_refined,
        stt_model=row.stt_model,
        llm_model=row.llm_model,
        refinement_flags=flags_model,
        created_at=row.created_at,
    )


async def create_capture(
    *,
    audio_bytes: bytes,
    filename: str,
    source: str,
    language: Optional[str],
    stt_model: Optional[str],
    db: Session,
) -> CaptureResponse:
    """Persist raw audio, run STT, store the row."""
    if source not in VALID_SOURCES:
        raise ValueError(f"Invalid source '{source}'. Must be one of {sorted(VALID_SOURCES)}")

    capture_id = str(uuid.uuid4())
    suffix = Path(filename).suffix.lower() or ".wav"
    if suffix not in (".wav", ".mp3", ".m4a", ".flac", ".ogg", ".webm"):
        suffix = ".wav"

    raw_path = config.get_captures_dir() / f"{capture_id}{suffix}"
    written_files: list[Path] = []

    try:
        raw_path.write_bytes(audio_bytes)
        written_files.append(raw_path)

        # Decode once with librosa — its audioread fallback handles webm/opus
        # via ffmpeg, which miniaudio (used inside mlx-audio's whisper) can't.
        # The decoded array gives us an accurate duration and becomes the
        # canonical WAV we hand to whisper.
        try:
            audio, sr = load_audio(str(raw_path))
            duration_ms = int((len(audio) / sr) * 1000) if sr else None
        except Exception as decode_err:
            logger.warning(
                "Could not decode capture %s (%s): %r", capture_id, suffix, decode_err
            )
            audio, sr = None, None
            duration_ms = None

        if audio is None or sr is None:
            # Decode failed. Only pass the file straight to whisper if the
            # source is a format its miniaudio loader can still read — webm,
            # m4a, etc. would just 500 later. Surface a clean error instead.
            if suffix not in WHISPER_NATIVE_FORMATS:
                raise ValueError(
                    f"Could not decode {suffix} audio — the recording may be empty or corrupt"
                )
            audio_path = raw_path
        elif suffix == ".wav":
            audio_path = raw_path
        else:
            # Transcode to WAV so downstream loaders (miniaudio, soundfile) work
            # regardless of what format the client shipped.
            audio_path = config.get_captures_dir() / f"{capture_id}.wav"
            sf.write(str(audio_path), audio, sr, format="WAV")
            written_files.append(audio_path)
            with contextlib.suppress(OSError):
                raw_path.unlink()
                written_files.remove(raw_path)

        capture_settings = get_capture_settings(db)
        whisper = get_whisper_model()
        resolved_stt = stt_model or whisper.model_size
        task = "translate" if getattr(capture_settings, "translate_to_english", False) else "transcribe"
        transcript = await whisper.transcribe(str(audio_path), language, resolved_stt, task=task)

        # 1. Rule-based filler word removal (Handy feature: fast, zero-latency)
        if getattr(capture_settings, "remove_filler_words", False):
            transcript = remove_filler_words_rule(transcript)

        # 2. Custom vocabulary dictionary fuzzy replacement (Handy feature)
        custom_words = getattr(capture_settings, "custom_words", None)
        threshold = getattr(capture_settings, "word_correction_threshold", 0.8)
        if custom_words:
            transcript = apply_custom_words_correction(transcript, custom_words, threshold)

        # 3. Append trailing space (Handy feature)
        if getattr(capture_settings, "append_trailing_space", False) and transcript and not transcript.endswith(" "):
            transcript = transcript + " "

        # 4. Immediate audio cleanup if retention policy is "never"
        saved_audio_path: Optional[str] = config.to_storage_path(audio_path)
        if getattr(capture_settings, "recording_retention_period", "preserve_limit") == "never":
            with contextlib.suppress(OSError):
                audio_path.unlink()
            saved_audio_path = None

        row = DBCapture(
            id=capture_id,
            audio_path=saved_audio_path,
            source=source,
            language=language,
            duration_ms=duration_ms,
            transcript_raw=transcript,
            stt_model=resolved_stt,
        )
        db.add(row)
        db.commit()
        db.refresh(row)

        # 5. History retention pruning (Handy feature)
        with contextlib.suppress(Exception):
            prune_expired_captures(db, capture_settings)
    except Exception:
        # Anything between the first write and the commit means the audio on
        # disk has no row pointing at it — clean up so data/captures doesn't
        # accumulate orphan blobs across failed transcribes.
        for path in written_files:
            try:
                path.unlink()
            except OSError:
                pass
        raise

    return _to_response(row)


def prune_expired_captures(db: Session, settings: Optional[Any] = None) -> int:
    """
    Prune captures and audio files according to retention policy and history limit.
    Returns number of pruned captures.
    """
    if settings is None:
        settings = get_capture_settings(db)

    retention_period = getattr(settings, "recording_retention_period", "preserve_limit")
    history_limit = getattr(settings, "history_limit", 200)

    pruned_count = 0
    now = datetime.utcnow()

    # 1. Age-based retention pruning
    cutoff_date: Optional[datetime] = None
    if retention_period == "never":
        cutoff_date = now
    elif retention_period == "3_days":
        cutoff_date = now - timedelta(days=3)
    elif retention_period == "2_weeks":
        cutoff_date = now - timedelta(days=14)
    elif retention_period == "3_months":
        cutoff_date = now - timedelta(days=90)

    if cutoff_date:
        old_rows = db.query(DBCapture).filter(DBCapture.created_at < cutoff_date).all()
        for r in old_rows:
            if r.audio_path:
                resolved = config.resolve_storage_path(r.audio_path)
                if resolved and resolved.exists():
                    with contextlib.suppress(OSError):
                        resolved.unlink()
            db.delete(r)
            pruned_count += 1
        if old_rows:
            db.commit()

    # 2. History limit pruning
    if history_limit > 0:
        total = db.query(DBCapture).count()
        if total > history_limit:
            overflow = total - history_limit
            excess_rows = (
                db.query(DBCapture)
                .order_by(DBCapture.created_at.asc())
                .limit(overflow)
                .all()
            )
            for r in excess_rows:
                if r.audio_path:
                    resolved = config.resolve_storage_path(r.audio_path)
                    if resolved and resolved.exists():
                        with contextlib.suppress(OSError):
                            resolved.unlink()
                db.delete(r)
                pruned_count += 1
            if excess_rows:
                db.commit()

    return pruned_count


def list_captures(db: Session, limit: int = 50, offset: int = 0) -> tuple[list[CaptureResponse], int]:
    """Retrieve a paginated list of captures ordered by creation time descending."""
    total = db.query(DBCapture).count()
    rows = (
        db.query(DBCapture)
        .order_by(DBCapture.created_at.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )
    return [_to_response(r) for r in rows], total


def get_capture(capture_id: str, db: Session) -> Optional[CaptureResponse]:
    """Fetch a single capture record by ID, or None if not found."""
    row = db.query(DBCapture).filter(DBCapture.id == capture_id).first()
    return _to_response(row) if row else None


def delete_capture(capture_id: str, db: Session) -> bool:
    """Delete a capture row from the database and remove its audio file on disk."""
    row = db.query(DBCapture).filter(DBCapture.id == capture_id).first()
    if not row:
        return False

    resolved = config.resolve_storage_path(row.audio_path)
    if resolved and resolved.exists():
        try:
            resolved.unlink()
        except OSError:
            logger.exception("Failed to remove capture audio %s", resolved)

    db.delete(row)
    db.commit()
    return True


async def refine_capture(
    capture_id: str,
    flags: RefinementFlags,
    model_size: Optional[str],
    db: Session,
) -> Optional[CaptureResponse]:
    """Re-run the refinement LLM over an existing raw transcript with specified flags."""
    row = db.query(DBCapture).filter(DBCapture.id == capture_id).first()
    if not row:
        return None

    refined, llm_size = await refine_transcript(
        row.transcript_raw or "",
        flags,
        model_size=model_size,
    )

    row.transcript_refined = refined
    row.llm_model = llm_size
    row.refinement_flags = json.dumps(flags.to_dict())
    db.commit()
    db.refresh(row)
    return _to_response(row)


async def retranscribe_capture(
    capture_id: str,
    stt_model: Optional[str],
    language: Optional[str],
    db: Session,
) -> Optional[CaptureResponse]:
    """Re-run Whisper speech-to-text on an existing capture's persisted audio file."""
    row = db.query(DBCapture).filter(DBCapture.id == capture_id).first()
    if not row:
        return None

    resolved = config.resolve_storage_path(row.audio_path)
    if not resolved or not resolved.exists():
        raise FileNotFoundError(f"Audio for capture {capture_id} is missing")

    whisper = get_whisper_model()
    resolved_stt = stt_model or whisper.model_size
    transcript = await whisper.transcribe(str(resolved), language, resolved_stt)

    row.transcript_raw = transcript
    row.stt_model = resolved_stt
    if language:
        row.language = language
    # Refined text is stale after a fresh STT pass — force a re-refine.
    row.transcript_refined = None
    row.llm_model = None
    row.refinement_flags = None
    db.commit()
    db.refresh(row)
    return _to_response(row)
