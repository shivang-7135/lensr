from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    aws_region: str = "us-east-1"
    bedrock_model_reasoning: str = "anthropic.claude-3-5-sonnet-20241022-v2:0"
    bedrock_model_router: str = "anthropic.claude-3-haiku-20240307-v1:0"
    bedrock_model_vision: str = "anthropic.claude-3-5-sonnet-20241022-v2:0"

    serper_api_key: str | None = None
    tavily_api_key: str | None = None
    database_url: str | None = None

    backend_shared_secret: str = "change-me"
    cors_allow_origin: str = "*"


settings = Settings()
