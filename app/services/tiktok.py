from __future__ import annotations

import base64
import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urlencode

import httpx

from app.config import get_settings


class TiktokError(RuntimeError):
    pass


def _cfg():
    s = get_settings()
    if not s.tiktok_enabled:
        raise TiktokError("TikTok integration is not configured")
    return s


def generate_pkce() -> tuple[str, str]:
    """Return (code_verifier, code_challenge) — S256."""
    verifier = secrets.token_urlsafe(64)
    challenge = (
        base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest())
        .rstrip(b"=")
        .decode()
    )
    return verifier, challenge


def authorize_url(state: str, code_challenge: str) -> str:
    s = _cfg()
    params = {
        "client_key": s.tiktok_client_key,
        "scope": s.tiktok_scopes,
        "response_type": "code",
        "redirect_uri": s.tiktok_redirect_uri,
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }
    return f"{s.tiktok_auth_base}/v2/auth/authorize/?{urlencode(params)}"


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def exchange_code(code: str, code_verifier: str) -> dict[str, Any]:
    """Exchange auth code for access + refresh tokens."""
    s = _cfg()
    data = {
        "client_key": s.tiktok_client_key,
        "client_secret": s.tiktok_client_secret,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": s.tiktok_redirect_uri,
        "code_verifier": code_verifier,
    }
    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.post(
            f"{s.tiktok_api_base}/v2/oauth/token/",
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
    if r.status_code >= 400:
        raise TiktokError(f"Token exchange failed: {r.status_code} {r.text}")
    return r.json()


async def refresh_access_token(refresh_token: str) -> dict[str, Any]:
    s = _cfg()
    data = {
        "client_key": s.tiktok_client_key,
        "client_secret": s.tiktok_client_secret,
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
    }
    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.post(
            f"{s.tiktok_api_base}/v2/oauth/token/",
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
    if r.status_code >= 400:
        raise TiktokError(f"Token refresh failed: {r.status_code} {r.text}")
    return r.json()


async def fetch_user_info(access_token: str) -> dict[str, Any]:
    s = _cfg()
    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.get(
            f"{s.tiktok_api_base}/v2/user/info/",
            params={"fields": "open_id,union_id,display_name,avatar_url"},
            headers={"Authorization": f"Bearer {access_token}"},
        )
    if r.status_code >= 400:
        raise TiktokError(f"User info failed: {r.status_code} {r.text}")
    payload = r.json()
    return payload.get("data", {}).get("user", {})


def expires_at(seconds: int) -> datetime:
    return _now() + timedelta(seconds=max(int(seconds) - 60, 0))


# ---------- Content Posting API v2 (sync httpx for Celery worker) ----------

CHUNK_MIN = 5 * 1024 * 1024   # 5 MiB
CHUNK_MAX = 64 * 1024 * 1024  # 64 MiB


def refresh_access_token_sync(refresh_token: str) -> dict[str, Any]:
    s = _cfg()
    r = httpx.post(
        f"{s.tiktok_api_base}/v2/oauth/token/",
        data={
            "client_key": s.tiktok_client_key,
            "client_secret": s.tiktok_client_secret,
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=20.0,
    )
    if r.status_code >= 400:
        raise TiktokError(f"Token refresh failed: {r.status_code} {r.text}")
    return r.json()


def _sync_post(url: str, access_token: str, json_body: dict) -> dict:
    r = httpx.post(
        url,
        json=json_body,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json; charset=UTF-8",
        },
        timeout=30.0,
    )
    if r.status_code >= 400:
        raise TiktokError(f"{url} failed: {r.status_code} {r.text}")
    return r.json()


def init_direct_post(
    access_token: str,
    video_size: int,
    chunk_size: int,
    total_chunk_count: int,
    caption: str,
    privacy: str = "SELF_ONLY",
) -> dict:
    """POST /v2/post/publish/video/init/ (direct post)."""
    s = _cfg()
    body = {
        "post_info": {
            "title": caption[:2200] if caption else "",
            "privacy_level": privacy,
            "disable_duet": False,
            "disable_comment": False,
            "disable_stitch": False,
        },
        "source_info": {
            "source": "FILE_UPLOAD",
            "video_size": video_size,
            "chunk_size": chunk_size,
            "total_chunk_count": total_chunk_count,
        },
    }
    return _sync_post(
        f"{s.tiktok_api_base}/v2/post/publish/video/init/", access_token, body
    )


def upload_chunk(
    upload_url: str, chunk: bytes, byte_start: int, byte_end: int, total_size: int
) -> None:
    r = httpx.put(
        upload_url,
        content=chunk,
        headers={
            "Content-Type": "video/mp4",
            "Content-Length": str(len(chunk)),
            "Content-Range": f"bytes {byte_start}-{byte_end}/{total_size}",
        },
        timeout=120.0,
    )
    if r.status_code not in (200, 201, 206):
        raise TiktokError(f"Chunk upload failed: {r.status_code} {r.text}")


def fetch_publish_status(access_token: str, publish_id: str) -> dict:
    s = _cfg()
    return _sync_post(
        f"{s.tiktok_api_base}/v2/post/publish/status/fetch/",
        access_token,
        {"publish_id": publish_id},
    )


def iter_chunks(path: str, chunk_size: int):
    with open(path, "rb") as f:
        idx = 0
        while True:
            data = f.read(chunk_size)
            if not data:
                break
            yield idx, data
            idx += 1


def pick_chunk_size(file_size: int) -> tuple[int, int]:
    """Return (chunk_size, total_chunk_count) within TikTok's 5-64 MiB window."""
    if file_size <= CHUNK_MIN:
        return file_size, 1
    chunk_size = min(CHUNK_MAX, max(CHUNK_MIN, file_size // 10))
    total = (file_size + chunk_size - 1) // chunk_size
    return chunk_size, total


def file_size(path: str) -> int:
    return os.path.getsize(path)
