from __future__ import annotations

import json
import secrets
from datetime import UTC, datetime

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_session
from app.models import TiktokAccount
from app.services.tiktok import (
    TiktokError,
    authorize_url,
    exchange_code,
    expires_at,
    fetch_user_info,
    generate_pkce,
)
from app.utils.crypto import encrypt

router = APIRouter()

_STATE_TTL = 600  # 10 minutes


def _redis():
    return aioredis.from_url(get_settings().redis_url, decode_responses=True)


@router.get("/auth/tiktok/login")
async def tiktok_login(request: Request):
    settings = get_settings()
    if not settings.tiktok_enabled:
        raise HTTPException(status_code=503, detail="TikTok integration not configured")

    state = secrets.token_urlsafe(24)
    verifier, challenge = generate_pkce()

    client = _redis()
    try:
        await client.setex(
            f"tiktok:oauth:{state}",
            _STATE_TTL,
            json.dumps({"verifier": verifier}),
        )
    finally:
        await client.aclose()

    return RedirectResponse(authorize_url(state, challenge))


@router.get("/auth/tiktok/callback")
async def tiktok_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    session: AsyncSession = Depends(get_session),
):
    settings = get_settings()
    if error:
        raise HTTPException(status_code=400, detail=f"TikTok error: {error}")
    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing code or state")

    client = _redis()
    try:
        raw = await client.get(f"tiktok:oauth:{state}")
        if not raw:
            raise HTTPException(status_code=400, detail="Invalid or expired state")
        await client.delete(f"tiktok:oauth:{state}")
    finally:
        await client.aclose()

    verifier = json.loads(raw)["verifier"]

    try:
        tokens = await exchange_code(code, verifier)
        user = await fetch_user_info(tokens["access_token"])
    except TiktokError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    open_id = user.get("open_id") or tokens.get("open_id")
    if not open_id:
        raise HTTPException(status_code=502, detail="TikTok did not return open_id")

    now = datetime.now(UTC)
    account = await session.get(TiktokAccount, open_id)
    if account is None:
        account = TiktokAccount(open_id=open_id)
        session.add(account)

    account.union_id = user.get("union_id")
    account.display_name = user.get("display_name")
    account.avatar_url = user.get("avatar_url")
    account.scopes = tokens.get("scope", settings.tiktok_scopes)
    account.access_token_enc = encrypt(tokens["access_token"])
    account.refresh_token_enc = encrypt(tokens["refresh_token"])
    account.access_expires_at = expires_at(tokens.get("expires_in", 3600))
    account.refresh_expires_at = expires_at(tokens.get("refresh_expires_in", 86400 * 365))
    account.updated_at = now

    await session.commit()

    target = f"{settings.tiktok_post_connect_redirect}?tiktok=connected&open_id={open_id}"
    return RedirectResponse(target)


@router.get("/auth/tiktok/accounts")
async def list_accounts(session: AsyncSession = Depends(get_session)):
    """Dev helper: list connected TikTok accounts (no secrets returned)."""
    from sqlalchemy import select

    rows = (await session.execute(select(TiktokAccount))).scalars().all()
    return [
        {
            "open_id": a.open_id,
            "display_name": a.display_name,
            "avatar_url": a.avatar_url,
            "scopes": a.scopes,
            "connected_at": a.created_at,
        }
        for a in rows
    ]
