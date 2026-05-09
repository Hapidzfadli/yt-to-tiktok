from __future__ import annotations

from pathlib import Path

import boto3
from botocore.config import Config

from app.config import get_settings


def _client(endpoint_url: str | None = None):
    s = get_settings()
    url = endpoint_url if endpoint_url is not None else (s.s3_endpoint_url or None)
    return boto3.client(
        "s3",
        region_name=s.s3_region,
        endpoint_url=url,
        aws_access_key_id=s.aws_access_key_id,
        aws_secret_access_key=s.aws_secret_access_key,
        config=Config(signature_version="s3v4"),
    )


def upload_file(local_path: str, key: str) -> str:
    """Upload a local file to S3 under `key`. Returns the object key."""
    s = get_settings()
    if not s.s3_enabled:
        raise RuntimeError("S3 not configured")
    _client().upload_file(
        local_path,
        s.s3_bucket,
        key,
        ExtraArgs={"ContentType": "video/mp4"},
    )
    return key


def presigned_url(key: str) -> str:
    s = get_settings()
    # Presigned URL harus pakai endpoint yang bisa diakses browser.
    # Untuk MinIO: s3_public_endpoint_url=http://localhost:9000
    public_url = s.s3_public_endpoint_url or s.s3_endpoint_url or None
    return _client(endpoint_url=public_url).generate_presigned_url(
        "get_object",
        Params={"Bucket": s.s3_bucket, "Key": key},
        ExpiresIn=s.s3_presign_expires,
    )


def local_fallback_url(local_path: str) -> str:
    """Return a file:// URL for dev when S3 is not configured."""
    return Path(local_path).resolve().as_uri()
