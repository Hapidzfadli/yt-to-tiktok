from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "dev"
    app_cors_origins: str = "http://localhost:3000"

    database_url: str = "postgresql+asyncpg://yt2tt:yt2tt@postgres:5432/yt2tt"

    redis_url: str = "redis://redis:6379/0"
    celery_broker_url: str = "redis://redis:6379/1"
    celery_result_backend: str = "redis://redis:6379/2"

    s3_bucket: str = ""
    s3_region: str = "ap-southeast-1"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    s3_presign_expires: int = 86400

    media_dir: str = "/tmp/yt2tt"

    tiktok_client_key: str = ""
    tiktok_client_secret: str = ""
    tiktok_redirect_uri: str = "http://localhost:8000/api/auth/tiktok/callback"
    tiktok_scopes: str = "user.info.basic,video.upload,video.publish"
    tiktok_api_base: str = "https://open.tiktokapis.com"
    tiktok_auth_base: str = "https://www.tiktok.com"
    tiktok_post_connect_redirect: str = "http://localhost:3000"

    fernet_key: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.app_cors_origins.split(",") if o.strip()]

    @property
    def s3_enabled(self) -> bool:
        return bool(self.s3_bucket and self.aws_access_key_id and self.aws_secret_access_key)

    @property
    def tiktok_enabled(self) -> bool:
        return bool(
            self.tiktok_client_key and self.tiktok_client_secret and self.fernet_key
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
