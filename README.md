# yt-to-tiktok

FastAPI backend yang mengubah video YouTube menjadi format siap-post ke TikTok.
Pipeline: `yt-dlp` (download) → `ffmpeg` (trim + reframe ke 9:16) → S3 (temp storage).

## Stack

- **FastAPI** — API layer (async, SSE progress streaming)
- **Celery + Redis** — background video processing
- **PostgreSQL** — job state
- **yt-dlp + FFmpeg** — download + transcode
- **S3** — temp output storage (opsional di dev; fallback ke file lokal)

## Phase 1 (current) — Core Pipeline

- [x] `POST /api/fetch-info` — metadata YouTube via `yt-dlp`
- [x] `POST /api/convert` — enqueue Celery job
- [x] Celery pipeline: download → convert 9:16 → upload S3
- [x] `GET /api/jobs/{id}` — snapshot status
- [x] `GET /api/jobs/{id}/status` — SSE stream real-time progress

## Phase 2 (next) — TikTok Integration

- [ ] OAuth 2.0 login flow
- [ ] Token storage (encrypted) + auto-refresh
- [ ] TikTok Content Posting API v2 (init → chunk upload → publish)

## Phase 3 — Production

- [ ] Deploy (EC2 / Railway)
- [ ] S3 lifecycle 24h auto-delete
- [ ] Rate limiting per user, retry/backoff hardening

## Quick start

```bash
cp .env.example .env
docker compose up --build
```

- API: http://localhost:8000 (docs di `/docs`)
- Worker logs: `docker compose logs -f worker`

### Contoh pemakaian

```bash
# 1. Ambil metadata
curl -X POST http://localhost:8000/api/fetch-info \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'

# 2. Enqueue konversi
curl -X POST http://localhost:8000/api/convert \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ",
       "options":{"aspect":"9:16","start":0,"end":30}}'
# -> {"job_id":"<uuid>"}

# 3. Stream progress (SSE)
curl -N http://localhost:8000/api/jobs/<uuid>/status
```

## Layout

```
app/
├── main.py            # FastAPI app factory
├── config.py          # Settings (pydantic-settings)
├── database.py        # Async SQLAlchemy session
├── db_sync.py         # Sync session for Celery worker
├── models.py          # Job model
├── schemas.py         # Pydantic DTOs
├── celery_app.py      # Celery instance
├── tasks.py           # process_video task
├── api/
│   ├── videos.py      # /fetch-info, /convert
│   └── jobs.py        # /jobs/{id}, /jobs/{id}/status (SSE)
├── services/
│   ├── youtube.py     # yt-dlp wrapper
│   ├── ffmpeg.py      # FFmpeg wrapper
│   └── s3.py          # S3 upload + presign
└── utils/
    └── progress.py    # Redis pub/sub progress channel
```

## Catatan

- Untuk dev tanpa S3: kosongkan `S3_BUCKET` di `.env` — output URL akan memakai
  `file://` path lokal di volume `media_tmp`.
- FFmpeg progress di-map: download 5-45%, convert 50-85%, upload 90-100%.
