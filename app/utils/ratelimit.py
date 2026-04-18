from __future__ import annotations

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import get_settings


def _key(request: Request) -> str:
    """Prefer X-Forwarded-For (when behind proxy), fallback to client IP."""
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",", 1)[0].strip()
    return get_remote_address(request)


limiter = Limiter(
    key_func=_key,
    storage_uri=get_settings().redis_url,
    default_limits=["120/minute"],
    headers_enabled=True,
)
