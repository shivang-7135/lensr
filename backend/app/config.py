from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    aws_region: str = "us-east-1"
    bedrock_model_reasoning: str = "us.anthropic.claude-sonnet-4-5-20250929-v1:0"
    bedrock_model_router: str = "us.anthropic.claude-haiku-4-5-20251001-v1:0"
    bedrock_model_vision: str = "us.anthropic.claude-sonnet-4-5-20250929-v1:0"

    serper_api_key: str | None = None
    tavily_api_key: str | None = None
    database_url: str | None = None

    backend_shared_secret: str = "change-me"
    cors_allow_origin: str = "*"


settings = Settings()
