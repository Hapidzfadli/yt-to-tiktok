from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, jobs, tiktok, videos
from app.config import get_settings
from app.database import Base, engine

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(title="yt-to-tiktok API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(videos.router, prefix="/api", tags=["videos"])
app.include_router(jobs.router, prefix="/api", tags=["jobs"])
app.include_router(auth.router, prefix="/api", tags=["auth"])
app.include_router(tiktok.router, prefix="/api", tags=["tiktok"])


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
