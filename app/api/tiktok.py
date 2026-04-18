from __future__ import annotations

import uuid
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models import Job, JobStatus, PublishJob, PublishStatus, TiktokAccount
from app.tasks import publish_to_tiktok

router = APIRouter()


class PublishRequest(BaseModel):
    convert_job_id: str
    open_id: str
    caption: str = Field(default="", max_length=2200)
    privacy: Literal["SELF_ONLY", "PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS"] = (
        "SELF_ONLY"
    )


class PublishJobCreated(BaseModel):
    publish_job_id: str


class PublishJobView(BaseModel):
    id: str
    convert_job_id: str
    open_id: str
    status: str
    progress: int
    publish_id: str | None
    error: str | None

    class Config:
        from_attributes = True


@router.post("/tiktok/publish", response_model=PublishJobCreated, status_code=202)
async def publish_endpoint(
    payload: PublishRequest, session: AsyncSession = Depends(get_session)
):
    job = await session.get(Job, payload.convert_job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Convert job not found")
    if job.status != JobStatus.COMPLETED.value:
        raise HTTPException(
            status_code=409,
            detail=f"Convert job not completed yet (status={job.status})",
        )

    account = await session.get(TiktokAccount, payload.open_id)
    if not account:
        raise HTTPException(status_code=404, detail="TikTok account not connected")

    pjid = str(uuid.uuid4())
    pj = PublishJob(
        id=pjid,
        convert_job_id=payload.convert_job_id,
        open_id=payload.open_id,
        caption=payload.caption or job.title,
        privacy=payload.privacy,
        status=PublishStatus.PENDING.value,
        progress=0,
    )
    session.add(pj)
    await session.commit()

    publish_to_tiktok.delay(pjid)
    return PublishJobCreated(publish_job_id=pjid)


@router.get("/tiktok/publish/{publish_job_id}", response_model=PublishJobView)
async def get_publish_job(
    publish_job_id: str, session: AsyncSession = Depends(get_session)
):
    pj = await session.get(PublishJob, publish_job_id)
    if not pj:
        raise HTTPException(status_code=404, detail="Publish job not found")
    return PublishJobView.model_validate(pj)
