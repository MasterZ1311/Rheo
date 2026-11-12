"""Operating-system secure credential storage for Rheo Cloud API keys."""

import logging
import os
from pathlib import Path
from typing import Optional

from .. import config

logger = logging.getLogger(__name__)

SERVICE_NAME = "rheo"
ACCOUNT_NAME = "cloud_api_key"
_FALLBACK_FILE_NAME = ".cloud_credentials"

# Session in-memory cache if local disk is read-only
_memory_fallback: Optional[str] = None


def _get_fallback_path() -> Path:
    """Return path to the fallback credentials file in the data dir."""
    return config.get_data_dir() / _FALLBACK_FILE_NAME


def store_cloud_key(api_key: str) -> bool:
    """Store the cloud API key in the OS keyring, or in a secured local fallback.

    Returns True if successfully stored in keyring or fallback.
    """
    global _memory_fallback
    # 1. Try OS keyring first
    try:
        import keyring

        keyring.set_password(SERVICE_NAME, ACCOUNT_NAME, api_key)
        # Clear fallback file if keyring succeeds
        _delete_fallback()
        _memory_fallback = None
        return True
    except Exception as exc:
        logger.warning("Could not store cloud API key in OS keyring, using secure local fallback: %s", exc)

    # 2. Keyring unavailable or failed: use local secure fallback file with restricted permissions
    try:
        fallback_path = _get_fallback_path()
        flags = os.O_WRONLY | os.O_CREAT | os.O_TRUNC
        mode = 0o600
        fd = os.open(fallback_path, flags, mode)
        with open(fd, "w", encoding="utf-8") as f:
            f.write(api_key)
        _memory_fallback = api_key
        return True
    except Exception as exc:
        logger.warning("Could not store cloud API key in fallback file: %s", exc)
        _memory_fallback = api_key
        return True


def retrieve_cloud_key() -> Optional[str]:
    """Retrieve the cloud API key from the OS keyring or secure local fallback."""
    # 1. Try OS keyring first
    try:
        import keyring

        key = keyring.get_password(SERVICE_NAME, ACCOUNT_NAME)
        if key:
            return key
    except Exception as exc:
        logger.debug("Could not read cloud API key from OS keyring: %s", exc)

    # 2. Try secure fallback file
    try:
        fallback_path = _get_fallback_path()
        if fallback_path.exists():
            return fallback_path.read_text(encoding="utf-8").strip()
    except Exception as exc:
        logger.debug("Could not read cloud API key from fallback file: %s", exc)

    # 3. Try in-memory fallback
    return _memory_fallback


def _delete_fallback() -> None:
    """Remove local fallback file and memory cache."""
    global _memory_fallback
    _memory_fallback = None
    try:
        fallback_path = _get_fallback_path()
        if fallback_path.exists():
            fallback_path.unlink(missing_ok=True)
    except Exception as exc:
        logger.debug("Could not delete fallback credentials file: %s", exc)


def delete_cloud_key() -> None:
    """Delete the cloud API key from the OS keyring and any fallback store."""
    _delete_fallback()
    try:
        import keyring

        try:
            keyring.delete_password(SERVICE_NAME, ACCOUNT_NAME)
        except keyring.errors.PasswordDeleteError:
            pass
    except Exception as exc:
        logger.debug("Could not delete cloud API key from OS keyring: %s", exc)
