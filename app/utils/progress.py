from __future__ import annotations

import json

import redis

from app.config import get_settings


def _channel(job_id: str) -> str:
    return f"job:{job_id}:progress"


def publish(job_id: str, payload: dict) -> None:
    """Publish a progress event for a job (fire-and-forget, sync client)."""
    r = redis.Redis.from_url(get_settings().redis_url)
    try:
        r.publish(_channel(job_id), json.dumps(payload))
        r.setex(f"job:{job_id}:last", 3600, json.dumps(payload))
    finally:
        r.close()


def subscribe_channel(job_id: str) -> str:
    return _channel(job_id)


def last_snapshot(job_id: str) -> dict | None:
    r = redis.Redis.from_url(get_settings().redis_url)
    try:
        raw = r.get(f"job:{job_id}:last")
        return json.loads(raw) if raw else None
    finally:
        r.close()
