"""Idempotently apply a lifecycle rule that expires `jobs/*` objects after 24h.

Run once after provisioning the bucket:

    python -m scripts.setup_s3_lifecycle

Reads S3 config from the same .env the app uses.
"""

from __future__ import annotations

import sys

from app.config import get_settings
from app.services.s3 import _client

RULE_ID = "yt2tt-jobs-24h-expiry"


def main() -> int:
    s = get_settings()
    if not s.s3_enabled:
        print("S3 not configured. Set S3_BUCKET / AWS_* env vars first.")
        return 1

    client = _client()
    rule = {
        "ID": RULE_ID,
        "Status": "Enabled",
        "Filter": {"Prefix": "jobs/"},
        "Expiration": {"Days": 1},
        "AbortIncompleteMultipartUpload": {"DaysAfterInitiation": 1},
    }

    try:
        existing = client.get_bucket_lifecycle_configuration(Bucket=s.s3_bucket)
        rules = [r for r in existing.get("Rules", []) if r.get("ID") != RULE_ID]
    except client.exceptions.ClientError as e:
        if e.response["Error"]["Code"] == "NoSuchLifecycleConfiguration":
            rules = []
        else:
            raise

    rules.append(rule)
    client.put_bucket_lifecycle_configuration(
        Bucket=s.s3_bucket,
        LifecycleConfiguration={"Rules": rules},
    )
    print(f"Applied lifecycle rule `{RULE_ID}` to bucket `{s.s3_bucket}`.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
