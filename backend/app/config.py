import logging
import sys

from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    aws_region: str = "us-east-1"
    bedrock_model_reasoning: str = "us.anthropic.claude-sonnet-4-5-20250929-v1:0"
    bedrock_model_router: str = "us.anthropic.claude-haiku-4-5-20251001-v1:0"
    bedrock_model_vision: str = "us.anthropic.claude-sonnet-4-5-20250929-v1:0"

    serper_api_key: str | None = None
    tavily_api_key: str | None = None
    database_url: str | None = None

    backend_shared_secret: str = ""
    cors_allow_origin: str = "http://localhost:3000"


settings = Settings()

# --- Startup validation ---
_INSECURE_SECRETS = {"", "change-me", "secret", "password"}

if settings.backend_shared_secret in _INSECURE_SECRETS:
    logger.critical(
        "BACKEND_SHARED_SECRET is not set or uses an insecure default. "
        "Set a strong random value via environment variable before running in production."
    )
    # Only allow insecure secret in local dev (CORS points to localhost)
    _is_local = settings.cors_allow_origin.startswith("http://localhost")
    if not _is_local:
        # In non-local environments, refuse to start without a proper secret
        sys.exit(1)

if not settings.serper_api_key:
    logger.warning(
        "SERPER_API_KEY is not set. All web searches will return empty results. "
        "The pipeline will produce low-quality or hallucinated answers."
    )

if settings.cors_allow_origin == "*":
    logger.warning(
        "CORS_ALLOW_ORIGIN is set to '*'. This is insecure for production. "
        "Set it to your frontend domain (e.g. https://lensr.app)."
    )
