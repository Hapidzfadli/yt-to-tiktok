from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models import Job, JobStatus
from app.schemas import (
    ConvertRequest,
    FetchInfoRequest,
    JobCreated,
    VideoInfo,
)
from app.services.youtube import YoutubeError, fetch_info
from app.tasks import process_video
from app.utils.ratelimit import limiter

router = APIRouter()


@router.post("/fetch-info", response_model=VideoInfo)
@limiter.limit("30/minute")
async def fetch_info_endpoint(
    request: Request, payload: FetchInfoRequest
) -> VideoInfo:
    try:
        return await run_in_threadpool(fetch_info, str(payload.url))
    except YoutubeError as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch info: {e}") from e


@router.post("/convert", response_model=JobCreated, status_code=202)
@limiter.limit("10/minute")
async def convert_endpoint(
    request: Request,
    payload: ConvertRequest,
    session: AsyncSession = Depends(get_session),
) -> JobCreated:
    job_id = str(uuid.uuid4())
    job = Job(
        id=job_id,
        youtube_url=str(payload.url),
        status=JobStatus.PENDING.value,
        progress=0,
        options=payload.options.model_dump(),
    )
    session.add(job)
    await session.commit()

    process_video.delay(job_id, str(payload.url), payload.options.model_dump())
    return JobCreated(job_id=job_id)
