from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl


class FetchInfoRequest(BaseModel):
    url: HttpUrl


class VideoInfo(BaseModel):
    id: str
    title: str
    duration: int | None = None
    thumbnail: str | None = None
    uploader: str | None = None
    view_count: int | None = None
    description: str | None = None


class ConvertOptions(BaseModel):
    start: float | None = Field(default=None, ge=0, description="Trim start in seconds")
    end: float | None = Field(default=None, ge=0, description="Trim end in seconds")
    aspect: Literal["9:16", "1:1", "16:9"] = "9:16"
    add_caption: bool = False


class ConvertRequest(BaseModel):
    url: HttpUrl
    options: ConvertOptions = ConvertOptions()


class JobCreated(BaseModel):
    job_id: str


class JobStatusResponse(BaseModel):
    id: str
    status: str
    progress: int
    title: str | None = None
    duration: int | None = None
    output_url: str | None = None
    error: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
