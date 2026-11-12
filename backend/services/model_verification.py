"""AI Model cache integrity verification service.

Validates that locally cached models are complete, non-corrupted,
free of incomplete download fragments, and meet weight and structure requirements.
"""

import hashlib
import json
import logging
from pathlib import Path
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

VALID_WEIGHT_EXTENSIONS = (
    ".safetensors",
    ".bin",
    ".pt",
    ".pth",
    ".npz",
    ".onnx",
)


def verify_model_cache(
    hf_repo_id: str,
    cache_dir: Optional[Path] = None,
    expected_sha256: Optional[dict[str, str]] = None,
) -> Tuple[bool, Optional[str]]:
    """Verify integrity of a model cached in the HuggingFace Hub directory.

    Checks:
    1. Model directory exists.
    2. No active .incomplete blobs remain from aborted downloads.
    3. Snapshots directory contains valid, non-empty model weights.
    4. config.json (if present) is non-empty and valid JSON.
    5. Expected SHA-256 hashes match if provided.

    Returns:
        (True, None) if model cache is valid and ready for offline inference.
        (False, failure_reason) if any check fails.
    """
    if cache_dir is None:
        try:
            from huggingface_hub import constants as hf_constants

            cache_dir = Path(hf_constants.HF_HUB_CACHE)
        except Exception:
            from ..config import get_models_cache_dir

            cache_dir = get_models_cache_dir()

    repo_folder = cache_dir / ("models--" + hf_repo_id.replace("/", "--"))
    if not repo_folder.exists() or not repo_folder.is_dir():
        return False, f"Model cache directory not found: {repo_folder}"

    # Check for incomplete download fragments in blobs/
    blobs_dir = repo_folder / "blobs"
    if blobs_dir.exists() and blobs_dir.is_dir():
        incomplete_files = list(blobs_dir.glob("*.incomplete"))
        if incomplete_files:
            return False, f"Model contains {len(incomplete_files)} incomplete download fragments (.incomplete)"

    # Check snapshots
    snapshots_dir = repo_folder / "snapshots"
    if not snapshots_dir.exists() or not snapshots_dir.is_dir():
        return False, "Model snapshots directory not found"

    snapshot_dirs = [d for d in snapshots_dir.iterdir() if d.is_dir()]
    if not snapshot_dirs:
        return False, "No model revisions or snapshots found in cache"

    # Search for weight files in all snapshots
    weight_files = [
        f
        for f in snapshots_dir.rglob("*")
        if f.is_file() and f.suffix.lower() in VALID_WEIGHT_EXTENSIONS
    ]
    if not weight_files:
        return False, "No valid model weight files found in snapshots"

    empty_weights = [f for f in weight_files if f.stat().st_size == 0]
    if empty_weights:
        return False, f"Found empty (0-byte) model weight file: {empty_weights[0].name}"

    # Validate config.json if present
    config_files = list(snapshots_dir.rglob("config.json"))
    for cfg_file in config_files:
        if cfg_file.is_file():
            if cfg_file.stat().st_size == 0:
                return False, "Found empty config.json"
            try:
                with open(cfg_file, "r", encoding="utf-8") as jf:
                    json.load(jf)
            except Exception as err:
                return False, f"Corrupted config.json: {err}"

    # Verify SHA-256 hashes if specified
    if expected_sha256:
        for filename, expected_hash in expected_sha256.items():
            matches = list(snapshots_dir.rglob(filename))
            if not matches:
                return False, f"Expected verified file not found: {filename}"
            target_file = matches[0]
            hasher = hashlib.sha256()
            try:
                with open(target_file, "rb") as bf:
                    while chunk := bf.read(65536):
                        hasher.update(chunk)
            except OSError as err:
                return False, f"Failed to read file for checksum verification: {err}"

            actual_hash = hasher.hexdigest().lower()
            if actual_hash != expected_hash.lower():
                return False, f"Checksum mismatch for {filename}: expected {expected_hash}, got {actual_hash}"

    return True, None


def verify_model_by_name(
    model_name: str,
    cache_dir: Optional[Path] = None,
) -> Tuple[bool, Optional[str]]:
    """Verify integrity of a supported model by its registered name."""
    from ..backends import get_model_config

    config = get_model_config(model_name)
    if not config:
        return False, f"Unknown model name: {model_name}"

    return verify_model_cache(
        hf_repo_id=config.hf_repo_id,
        cache_dir=cache_dir,
        expected_sha256=config.sha256_checksums or None,
    )
