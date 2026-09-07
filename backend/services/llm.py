"""
LLM inference module - delegates to backend abstraction layer.
"""

from ..backends import get_llm_backend, LLMBackend


class _MockLLMBackend:
    model_size = "0.6B"

    def is_loaded(self) -> bool:
        return True

    def _is_model_cached(self, size: str) -> bool:
        return True

    async def load_model(self, size: str) -> None:
        pass

    async def generate(self, prompt: str, system: str = None, max_tokens: int = None, temperature: float = None, model_size: str = None, examples = None) -> str:
        return "Smoke test generated completion"

    def unload_model(self) -> None:
        pass


def get_llm_model() -> LLMBackend:
    """Get LLM backend instance (MLX or PyTorch based on platform)."""
    import os
    if os.environ.get("RHEO_SMOKE_TEST") == "1":
        return _MockLLMBackend()  # type: ignore

    return get_llm_backend()


def unload_llm_model() -> None:
    """Unload LLM model to free memory."""
    get_llm_backend().unload_model()
