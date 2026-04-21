from celery import Celery
from celery.signals import worker_process_init

from app.config import get_settings
from app.utils.logging import setup_logging

settings = get_settings()


@worker_process_init.connect
def _init_worker(**_: object) -> None:
    setup_logging()

celery_app = Celery(
    "yt2tt",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.tasks"],
)

celery_app.conf.update(
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_reject_on_worker_lost=True,
    task_track_started=True,
    broker_connection_retry_on_startup=True,
    result_expires=3600,
)
