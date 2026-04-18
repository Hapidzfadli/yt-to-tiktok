from __future__ import annotations

import os
import shutil
import traceback
from pathlib import Path

from celery.utils.log import get_task_logger

from app.celery_app import celery_app
from app.config import get_settings
from app.db_sync import session_scope
from app.models import Job, JobStatus
from app.services import ffmpeg, s3, youtube
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
