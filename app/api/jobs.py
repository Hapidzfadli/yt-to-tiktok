from __future__ import annotations

import json

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from app.config import get_settings
from app.database import get_session
from app.models import Job
from app.schemas import JobStatusResponse
from app.utils.progress import last_snapshot, subscribe_channel

router = APIRouter()


@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job(job_id: str, session: AsyncSession = Depends(get_session)) -> JobStatusResponse:
    job = await session.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobStatusResponse.model_validate(job)


@router.get("/jobs/{job_id}/status")
async def stream_job_status(job_id: str, request: Request):
    """Server-Sent Events stream: emits progress events from Redis pub/sub."""
    settings = get_settings()
    channel = subscribe_channel(job_id)

    async def event_gen():
        snap = last_snapshot(job_id)
        if snap:
            yield {"event": "progress", "data": json.dumps(snap)}
            if snap.get("status") in {"completed", "failed"}:
                return

        client = aioredis.from_url(settings.redis_url, decode_responses=True)
        pubsub = client.pubsub()
        await pubsub.subscribe(channel)
        try:
            while True:
                if await request.is_disconnected():
                    break
                msg = await pubsub.get_message(ignore_subscribe_messages=True, timeout=15.0)
                if msg is None:
                    yield {"event": "ping", "data": "{}"}
                    continue
                data = msg.get("data")
                if not data:
                    continue
                try:
                    payload = json.loads(data)
                except (TypeError, ValueError):
                    continue
                yield {"event": "progress", "data": json.dumps(payload)}
                if payload.get("status") in {"completed", "failed"}:
                    break
        finally:
            await pubsub.unsubscribe(channel)
            await pubsub.close()
            await client.aclose()

    return EventSourceResponse(event_gen())
