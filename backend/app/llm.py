from langchain_aws import ChatBedrockConverse
from .config import settings

# Default timeout for LLM requests (seconds)
_REQUEST_TIMEOUT = 60
# Max retries for transient failures (429, 5xx)
_MAX_RETRIES = 3


def reasoning_llm() -> ChatBedrockConverse:
    return ChatBedrockConverse(
        model=settings.bedrock_model_reasoning,
        region_name=settings.aws_region,
        temperature=0.3,
        max_tokens=2048,
        config={"read_timeout": _REQUEST_TIMEOUT, "retries": {"max_attempts": _MAX_RETRIES}},
    )


def router_llm() -> ChatBedrockConverse:
    return ChatBedrockConverse(
        model=settings.bedrock_model_router,
        region_name=settings.aws_region,
        temperature=0.0,
        max_tokens=256,
        config={"read_timeout": 30, "retries": {"max_attempts": _MAX_RETRIES}},
    )


def vision_llm() -> ChatBedrockConverse:
    return ChatBedrockConverse(
        model=settings.bedrock_model_vision,
        region_name=settings.aws_region,
        temperature=0.4,
        max_tokens=1024,
        config={"read_timeout": _REQUEST_TIMEOUT, "retries": {"max_attempts": _MAX_RETRIES}},
    )
