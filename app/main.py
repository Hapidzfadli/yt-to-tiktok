from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.api import auth, jobs, tiktok, videos
from app.config import get_settings
from app.database import Base, engine
from app.utils.logging import setup_logging
from app.utils.ratelimit import limiter

settings = get_settings()
setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(title="yt-to-tiktok API", version="0.2.0", lifespan=lifespan)

app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def _rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": f"Rate limit exceeded: {exc.detail}"},
    )


app.add_middleware(SlowAPIMiddleware)
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


@app.get("/ready")
async def ready() -> JSONResponse:
    """Readiness probe: verify Postgres + Redis reachable."""
    import redis.asyncio as aioredis
    from sqlalchemy import text

    checks: dict[str, str] = {}
    ok = True

    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        checks["postgres"] = "ok"
    except Exception as e:  # pragma: no cover - best effort
        checks["postgres"] = f"fail: {e.__class__.__name__}"
        ok = False

    try:
        client = aioredis.from_url(settings.redis_url)
        try:
            await client.ping()
            checks["redis"] = "ok"
        finally:
            await client.aclose()
    except Exception as e:  # pragma: no cover
        checks["redis"] = f"fail: {e.__class__.__name__}"
        ok = False

    return JSONResponse(
        status_code=200 if ok else 503,
        content={"status": "ok" if ok else "degraded", "checks": checks},
    )
