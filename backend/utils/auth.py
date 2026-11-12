"""Security and authorization utilities for Rheo administrative endpoints."""

import os
import secrets
from fastapi import HTTPException, Request

from ..mcp_server.context import request_is_loopback

DEFAULT_ALLOWED_ORIGINS = {
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:17493",
    "http://127.0.0.1:17493",
    "tauri://localhost",
    "https://tauri.localhost",
    "http://tauri.localhost",
}


def get_allowed_origins() -> set[str]:
    """Return the set of trusted origins permitted for browser requests."""
    env_origins = {
        o.strip()
        for o in os.environ.get("RHEO_CORS_ORIGINS", "").split(",")
        if o.strip()
    }
    return DEFAULT_ALLOWED_ORIGINS | env_origins


def is_admin_authorized(request: Request) -> bool:
    """Return True if the caller is authorized for administrative actions.

    Loopback callers are authorized provided they are not browser-originated
    cross-site requests (e.g. CSRF or malicious website visiting localhost).
    Remote callers must supply a valid RHEO_API_KEY.
    """
    origin = request.headers.get("origin")
    sec_fetch_site = request.headers.get("sec-fetch-site")

    # If the request originated from an unexpected browser origin or cross-site context,
    # it cannot claim loopback admin privileges without an explicit API key.
    is_trusted_browser_context = True
    if origin and origin not in get_allowed_origins():
        is_trusted_browser_context = False
    if sec_fetch_site == "cross-site":
        is_trusted_browser_context = False

    if request_is_loopback() and is_trusted_browser_context:
        return True

    expected_key = os.environ.get("RHEO_API_KEY")
    if not expected_key:
        return False

    api_key = request.headers.get("X-API-Key")
    if not api_key:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            api_key = auth_header[7:].strip()

    if not api_key:
        return False

    return secrets.compare_digest(api_key, expected_key)


def require_admin(request: Request) -> None:
    """Dependency that denies unauthorized remote administrative requests."""
    if not is_admin_authorized(request):
        raise HTTPException(
            status_code=403,
            detail="Administrative action requires loopback access or valid X-API-Key",
        )

