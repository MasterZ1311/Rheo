import time
from typing import Optional
from ..backends import get_stt_backend, STTBackend

_last_used_timestamp: float = 0.0


def touch_whisper_activity() -> None:
    """Record current timestamp as last active STT time."""
    global _last_used_timestamp
    _last_used_timestamp = time.time()


class _MockWhisperBackend:
    model_size = "turbo"

    def is_loaded(self) -> bool:
        return True

    def _is_model_cached(self, size: str) -> bool:
        return True

    async def load_model_async(self, size: str) -> None:
        pass

    async def transcribe(self, path: str, language: str = None, model_size: str = None, task: str = "transcribe") -> str:
        return "Smoke test transcript"

    def unload_model(self) -> None:
        pass


def get_whisper_model() -> STTBackend:
    """
    Get STT backend instance (MLX or PyTorch based on platform).
    
    Returns:
        STT backend instance
    """
    import os
    if os.environ.get("RHEO_SMOKE_TEST") == "1":
        return _MockWhisperBackend()  # type: ignore

    touch_whisper_activity()
    return get_stt_backend()


def unload_whisper_model():
    """Unload Whisper model to free memory."""
    backend = get_stt_backend()
    backend.unload_model()


def check_idle_unload(timeout_minutes: int) -> bool:
    """
    Unload Whisper model if idle for longer than timeout_minutes.

    Returns:
        True if model was unloaded, False otherwise.
    """
    global _last_used_timestamp
    if timeout_minutes <= 0 or _last_used_timestamp <= 0.0:
        return False

    idle_seconds = time.time() - _last_used_timestamp
    if idle_seconds >= timeout_minutes * 60:
        backend = get_stt_backend()
        if hasattr(backend, "is_loaded") and backend.is_loaded():
            backend.unload_model()
            _last_used_timestamp = 0.0
            return True
    return False
