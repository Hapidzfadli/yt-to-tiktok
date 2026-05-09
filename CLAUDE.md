# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**yt-to-tiktok** is a full-stack app that downloads YouTube videos, transcodes them with FFmpeg (9:16, 1:1, 16:9 aspect ratios), and publishes them directly to TikTok via OAuth 2.0 + Content Posting API v2.

Stack: FastAPI + Celery/Redis + PostgreSQL + Next.js 14 (App Router).

## Commands

### Docker (recommended for full stack)
```bash
cp .env.example .env
docker compose up --build
# API: http://localhost:8000/docs  |  Web: http://localhost:3000
docker compose logs -f worker     # watch Celery task output
```

### Backend (manual)
```bash
pip install -r requirements.txt
python -m app.main                                      # FastAPI dev server
celery -A app.celery_app worker --loglevel=info         # in a separate terminal
```

### Frontend
```bash
cd web
cp .env.example .env.local
npm install
npm run dev          # http://localhost:3000
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint
npm run build        # production build
```

### Linting
```bash
ruff check app scripts   # backend (line-length: 100, Python 3.12)
cd web && npm run lint   # frontend ESLint
```

### CI smoke tests
```bash
python -m compileall -q app scripts
python -c "from app.main import app; print(len(app.routes), 'routes')"
```

## Architecture

### Request → Task → SSE flow
1. `POST /api/videos/convert` enqueues a Celery `process_video` task; returns `job_id`.
2. Task stages: download (yt-dlp, 5–45%) → FFmpeg transcode (50–85%) → S3 or `file://` upload (90–100%).
3. Each stage calls `utils/progress.py` which publishes to Redis pub/sub **and** caches the last event.
4. Frontend opens `EventSource /api/jobs/{id}/status`; SSE endpoint subscribes to that channel and replays cached snapshot for late joiners.

Same pattern applies to TikTok publishing (`publish_to_tiktok` task → `/api/tiktok/publish/{id}`).

### Backend layout (`app/`)
| Path | Role |
|---|---|
| `main.py` | App factory; lifespan creates DB tables; mounts routers; SlowAPI rate limiter |
| `config.py` | Pydantic `Settings`; feature flags via `@property` (S3 enabled, TikTok enabled) |
| `models.py` | `Job`, `TiktokAccount`, `PublishJob` (SQLAlchemy async ORM) |
| `tasks.py` | `process_video`, `publish_to_tiktok` Celery tasks |
| `api/` | Thin HTTP layer — `videos`, `jobs`, `auth`, `tiktok` routers |
| `services/` | Business logic — `youtube.py` (yt-dlp), `ffmpeg.py`, `s3.py`, `tiktok.py` |
| `utils/` | `progress.py` (Redis pub/sub), `crypto.py` (Fernet for token storage), `ratelimit.py`, `logging.py` |

Two database sessions: `database.py` (async, used by FastAPI routes) and `db_sync.py` (sync, used by Celery tasks).

### Frontend layout (`web/`)
`app/page.tsx` is a 5-step state machine: URL input → preview → options → progress (SSE) → TikTok publish.

`lib/api.ts` wraps all backend calls including `subscribeJob()` and `subscribePublishJob()` which return `EventSource` instances.

### TikTok OAuth tokens
Tokens are Fernet-encrypted (`utils/crypto.py`) before storage in `TiktokAccount`. The Celery `publish_to_tiktok` task auto-refreshes expired access tokens and re-encrypts them in-place. Requires `FERNET_KEY` env var (generate: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`).

## Key Environment Variables

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Async: `postgresql+asyncpg://...` |
| `REDIS_URL` | Used for Celery broker, result backend, rate limiter, and SSE pub/sub |
| `S3_BUCKET` | Leave empty to skip S3 and use local `file://` URLs (dev mode) |
| `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET` | TikTok developer app credentials |
| `TIKTOK_REDIRECT_URI` | Must match TikTok app settings exactly |
| `FERNET_KEY` | 32-byte base64 key for token encryption |
| `APP_ENV` | `dev` or `prod` (controls log format: plain vs JSON) |

## Rate Limits

- `/api/videos/fetch-info` — 30 req/min
- `/api/videos/convert` — 10 req/min  
- `/api/tiktok/publish` — 10 req/min

Rate limits are Redis-backed via SlowAPI; keyed by client IP (respects `X-Forwarded-For`).
