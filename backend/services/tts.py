"""
TTS inference module - delegates to backend abstraction layer.
"""

from typing import Optional
import numpy as np
import io
import soundfile as sf

from ..backends import get_tts_backend, TTSBackend


def get_tts_model() -> TTSBackend:
    """
    Get TTS backend instance (MLX or PyTorch based on platform).
    
    Returns:
        TTS backend instance
    """
    return get_tts_backend()


def unload_tts_model():
    """Unload TTS model to free memory, avoiding crash if generation is active."""
    from . import task_queue
    if getattr(task_queue, "_running_generation_tasks", None):
        import logging
        logging.getLogger(__name__).warning("Skipping TTS model unload: generation task currently active")
        return
    backend = get_tts_backend()
    backend.unload_model()


def audio_to_wav_bytes(audio: np.ndarray, sample_rate: int) -> bytes:
    """Convert audio array to WAV bytes."""
    buffer = io.BytesIO()
    sf.write(buffer, audio, sample_rate, format="WAV")
    buffer.seek(0)
    return buffer.read()
