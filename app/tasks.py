from __future__ import annotations

import os
import shutil
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path

import httpx
from celery.utils.log import get_task_logger

from app.celery_app import celery_app
from app.config import get_settings
from app.db_sync import session_scope
from app.models import Job, JobStatus, PublishJob, PublishStatus, TiktokAccount
from app.services import ffmpeg, s3, tiktok, youtube
from app.utils.crypto import decrypt, encrypt
from app.utils.progress import publish

logger = get_task_logger(__name__)
settings = get_settings()


def _update_job(job_id: str, **fields) -> None:
    with session_scope() as session:
        job = session.get(Job, job_id)
        if not job:
            logger.warning("Job %s not found in DB", job_id)
            return
        for k, v in fields.items():
            setattr(job, k, v)


def _emit(job_id: str, status: str, progress: int, **extra) -> None:
    payload = {"id": job_id, "status": status, "progress": progress, **extra}
    _update_job(job_id, status=status, progress=progress, **extra)
    publish(job_id, payload)


@celery_app.task(name="process_video", bind=True, max_retries=2)
def process_video(self, job_id: str, url: str, options: dict) -> dict:
    workdir = Path(settings.media_dir) / job_id
    workdir.mkdir(parents=True, exist_ok=True)

    try:
        _emit(job_id, JobStatus.DOWNLOADING.value, 5)

        def dl_hook(d):
            if d.get("status") == "downloading":
                total = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
                got = d.get("downloaded_bytes") or 0
                pct = int(got / total * 40) if total else 0
                _emit(job_id, JobStatus.DOWNLOADING.value, 5 + min(pct, 40))
            elif d.get("status") == "finished":
                _emit(job_id, JobStatus.DOWNLOADING.value, 45)

        out_tmpl = str(workdir / "src.%(ext)s")
        src_path = youtube.download(url, out_tmpl, progress_hook=dl_hook)

        info = youtube.fetch_info(url)
        _update_job(job_id, title=info.title, duration=info.duration)

        out_path = str(workdir / "out.mp4")

        def conv_cb(pct: int) -> None:
            mapped = 50 + int(pct * 0.35)
            _emit(job_id, JobStatus.CONVERTING.value, mapped)

        ffmpeg.convert(
            src_path,
            out_path,
            aspect=options.get("aspect", "9:16"),
            start=options.get("start"),
            end=options.get("end"),
            progress_cb=conv_cb,
        )

        _emit(job_id, JobStatus.UPLOADING.value, 90)

        if settings.s3_enabled:
            key = f"jobs/{job_id}/out.mp4"
            s3.upload_file(out_path, key)
            url_out = s3.presigned_url(key)
            _update_job(job_id, output_key=key, output_url=url_out)
        else:
            url_out = s3.local_fallback_url(out_path)
            _update_job(job_id, output_key=None, output_url=url_out)

        _emit(job_id, JobStatus.COMPLETED.value, 100, output_url=url_out)
        return {"job_id": job_id, "output_url": url_out}

    except Exception as exc:
        logger.exception("Job %s failed", job_id)
        err = f"{exc.__class__.__name__}: {exc}"
        _update_job(job_id, status=JobStatus.FAILED.value, error=err)
        publish(job_id, {"id": job_id, "status": JobStatus.FAILED.value, "error": err})
        try:
            raise self.retry(exc=exc, countdown=10)
        except self.MaxRetriesExceededError:
            return {"job_id": job_id, "error": err, "trace": traceback.format_exc()}
    finally:
        src = workdir / "src.mp4"
        if src.exists():
            try:
                os.remove(src)
            except OSError:
                pass
        if settings.s3_enabled:
            shutil.rmtree(workdir, ignore_errors=True)


# ---------- Phase 2: publish pipeline ----------

def _publish_emit(publish_job_id: str, status: str, progress: int, **extra) -> None:
    payload = {
        "kind": "publish",
        "id": publish_job_id,
        "status": status,
        "progress": progress,
        **extra,
    }
    with session_scope() as session:
        pj = session.get(PublishJob, publish_job_id)
        if pj:
            pj.status = status
            pj.progress = progress
            for k, v in extra.items():
                if hasattr(pj, k):
                    setattr(pj, k, v)
    publish(publish_job_id, payload)


def _ensure_fresh_token(open_id: str) -> str:
    """Return a valid access token, refreshing + persisting if needed."""
    now = datetime.now(timezone.utc)
    with session_scope() as session:
        account = session.get(TiktokAccount, open_id)
        if account is None:
            raise RuntimeError(f"TikTok account {open_id} not found")

        if account.access_expires_at > now:
            return decrypt(account.access_token_enc)

        refreshed = tiktok.refresh_access_token_sync(decrypt(account.refresh_token_enc))
        account.access_token_enc = encrypt(refreshed["access_token"])
        if refreshed.get("refresh_token"):
            account.refresh_token_enc = encrypt(refreshed["refresh_token"])
        account.access_expires_at = tiktok.expires_at(refreshed.get("expires_in", 3600))
        if refreshed.get("refresh_expires_in"):
            account.refresh_expires_at = tiktok.expires_at(refreshed["refresh_expires_in"])
        return refreshed["access_token"]


def _resolve_local_source_by_url(convert_job_id: str, output_url: str | None) -> str:
    """Return a local file path for the converted video (download from S3 if needed)."""
    workdir = Path(settings.media_dir) / convert_job_id
    local = workdir / "out.mp4"
    if local.exists():
        return str(local)

    if output_url and output_url.startswith("file://"):
        return output_url.replace("file://", "", 1)

    if not output_url:
        raise RuntimeError("Converted video URL missing")

    workdir.mkdir(parents=True, exist_ok=True)
    with httpx.stream("GET", output_url, timeout=120.0) as r:
        r.raise_for_status()
        with open(local, "wb") as f:
            for chunk in r.iter_bytes(chunk_size=1024 * 1024):
                f.write(chunk)
    return str(local)


@celery_app.task(name="publish_to_tiktok", bind=True, max_retries=1)
def publish_to_tiktok(self, publish_job_id: str) -> dict:
    with session_scope() as session:
        pj = session.get(PublishJob, publish_job_id)
        if not pj:
            return {"error": "publish job not found"}
        job = session.get(Job, pj.convert_job_id)
        account = session.get(TiktokAccount, pj.open_id)
        if not job or not account:
            pj.status = PublishStatus.FAILED.value
            pj.error = "Source job or TikTok account missing"
            return {"error": pj.error}
        caption = pj.caption or job.title or ""
        privacy = pj.privacy
        open_id = pj.open_id
        convert_job_id = pj.convert_job_id
        job_output_url = job.output_url

    try:
        access_token = _ensure_fresh_token(open_id)
    except Exception as exc:
        _publish_emit(
            publish_job_id,
            PublishStatus.FAILED.value,
            0,
            error=f"Token refresh failed: {exc}",
        )
        return {"error": str(exc)}

    try:
        _publish_emit(publish_job_id, PublishStatus.UPLOADING.value, 5)
        local_path = _resolve_local_source_by_url(convert_job_id, job_output_url)
        size = tiktok.file_size(local_path)
        chunk_size, total_chunks = tiktok.pick_chunk_size(size)

        init = tiktok.init_direct_post(
            access_token,
            video_size=size,
            chunk_size=chunk_size,
            total_chunk_count=total_chunks,
            caption=caption,
            privacy=privacy,
        )
        data = init.get("data", {})
        publish_id = data.get("publish_id")
        upload_url = data.get("upload_url")
        if not publish_id or not upload_url:
            raise RuntimeError(f"Init returned incomplete payload: {init}")

        _publish_emit(
            publish_job_id,
            PublishStatus.UPLOADING.value,
            10,
            publish_id=publish_id,
        )

        uploaded = 0
        for idx, chunk in tiktok.iter_chunks(local_path, chunk_size):
            start = idx * chunk_size
            end = start + len(chunk) - 1
            tiktok.upload_chunk(upload_url, chunk, start, end, size)
            uploaded += len(chunk)
            pct = 10 + int(uploaded / size * 70)
            _publish_emit(
                publish_job_id,
                PublishStatus.UPLOADING.value,
                min(pct, 80),
                publish_id=publish_id,
            )

        _publish_emit(
            publish_job_id,
            PublishStatus.PROCESSING.value,
            85,
            publish_id=publish_id,
        )

        deadline = time.time() + 180
        terminal = {"PUBLISH_COMPLETE", "FAILED", "SEND_TO_USER_INBOX"}
        while time.time() < deadline:
            status_resp = tiktok.fetch_publish_status(access_token, publish_id)
            status_data = status_resp.get("data", {}) or {}
            tt_status = status_data.get("status")
            fail_reason = status_data.get("fail_reason")

            if tt_status == "PUBLISH_COMPLETE":
                _publish_emit(
                    publish_job_id,
                    PublishStatus.PUBLISHED.value,
                    100,
                    publish_id=publish_id,
                )
                return {"publish_id": publish_id, "status": "published"}
            if tt_status == "FAILED" or fail_reason:
                err = fail_reason or "TikTok reported FAILED"
                _publish_emit(
                    publish_job_id,
                    PublishStatus.FAILED.value,
                    0,
                    publish_id=publish_id,
                    error=err,
                )
                return {"publish_id": publish_id, "error": err}
            if tt_status in terminal:
                _publish_emit(
                    publish_job_id,
                    PublishStatus.PUBLISHED.value,
                    100,
                    publish_id=publish_id,
                )
                return {"publish_id": publish_id, "status": tt_status}

            time.sleep(4)

        _publish_emit(
            publish_job_id,
            PublishStatus.PROCESSING.value,
            90,
            publish_id=publish_id,
            error="Status poll timed out; TikTok may still finish asynchronously",
        )
        return {"publish_id": publish_id, "status": "timeout"}

    except Exception as exc:
        logger.exception("Publish job %s failed", publish_job_id)
        err = f"{exc.__class__.__name__}: {exc}"
        _publish_emit(publish_job_id, PublishStatus.FAILED.value, 0, error=err)
        try:
            raise self.retry(exc=exc, countdown=15)
        except self.MaxRetriesExceededError:
            return {"error": err, "trace": traceback.format_exc()}
