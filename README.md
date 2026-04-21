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

Backend:
- [x] `POST /api/fetch-info` — metadata YouTube via `yt-dlp`
- [x] `POST /api/convert` — enqueue Celery job
- [x] Celery pipeline: download → convert 9:16 → upload S3
- [x] `GET /api/jobs/{id}` — snapshot status
- [x] `GET /api/jobs/{id}/status` — SSE stream real-time progress

Frontend (Next.js 14 + Tailwind):
- [x] 4-step flow: URL → Preview → Options → Progress
- [x] Real-time progress bar dari SSE
- [x] Pilih aspect (9:16 / 1:1 / 16:9) + trim start/end

## Phase 2 (current) — TikTok Integration

- [x] OAuth 2.0 + PKCE login flow: `/api/auth/tiktok/login`, `/callback`
- [x] Token storage terenkripsi (Fernet) + auto-refresh saat expired
- [x] Content Posting API v2: init → chunk upload (5–64 MiB) → status poll
- [x] `POST /api/tiktok/publish` + Celery task `publish_to_tiktok`
- [x] Frontend step "Publish": pilih akun, caption, privacy, progress SSE

### Setup TikTok

1. Daftarkan app di https://developers.tiktok.com/ (Login Kit + Content Posting API)
2. Set `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, dan redirect URI
   (`http://localhost:8000/api/auth/tiktok/callback` untuk dev)
3. Generate Fernet key: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`
   — taruh di `FERNET_KEY`
4. `docker compose up` → buka `http://localhost:3000` → "Hubungkan akun TikTok"

## Phase 3 — Production

- [ ] Deploy (EC2 / Railway)
- [ ] S3 lifecycle 24h auto-delete
- [ ] Rate limiting per user, retry/backoff hardening

## Quick start

```bash
cp .env.example .env
docker compose up --build
```

- Web: http://localhost:3000
- API: http://localhost:8000 (docs di `/docs`)
- Worker logs: `docker compose logs -f worker`

### Frontend-only dev (tanpa docker)

```bash
cd web
cp .env.example .env.local   # set NEXT_PUBLIC_API_BASE_URL bila API di host lain
npm install
npm run dev
```

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
web/                   # Next.js 14 (App Router) + Tailwind
├── app/
│   ├── layout.tsx
│   ├── page.tsx       # state machine 4-step
│   └── globals.css
├── components/
│   ├── Stepper.tsx
│   └── steps/
│       ├── StepUrl.tsx
│       ├── StepPreview.tsx
│       ├── StepOptions.tsx
│       └── StepProgress.tsx  # EventSource → SSE
└── lib/
    ├── api.ts         # fetch + subscribeJob helper
    ├── types.ts
    └── format.ts

app/                   # FastAPI backend
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
