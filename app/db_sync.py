from __future__ import annotations

from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import get_settings


def _sync_url(async_url: str) -> str:
    return async_url.replace("+asyncpg", "+psycopg").replace(
        "postgresql://", "postgresql+psycopg://"
    )


_settings = get_settings()
_engine = create_engine(_sync_url(_settings.database_url), future=True, pool_pre_ping=True)
SessionLocalSync = sessionmaker(_engine, expire_on_commit=False, class_=Session)


@contextmanager
def session_scope():
    session = SessionLocalSync()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
