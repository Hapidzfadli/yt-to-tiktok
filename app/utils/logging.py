from __future__ import annotations

import logging
import os

from pythonjsonlogger import jsonlogger


def setup_logging() -> None:
    """Configure root logger with JSON output in prod, plain in dev."""
    level = os.environ.get("LOG_LEVEL", "INFO").upper()
    app_env = os.environ.get("APP_ENV", "dev")

    handler = logging.StreamHandler()
    if app_env == "dev":
        handler.setFormatter(
            logging.Formatter("%(asctime)s %(levelname)s %(name)s - %(message)s")
        )
    else:
        handler.setFormatter(
            jsonlogger.JsonFormatter(
                "%(asctime)s %(levelname)s %(name)s %(message)s",
                rename_fields={"asctime": "ts", "levelname": "level"},
            )
        )

    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level)

    for noisy in ("uvicorn.access", "sqlalchemy.engine"):
        logging.getLogger(noisy).setLevel(logging.WARNING)
