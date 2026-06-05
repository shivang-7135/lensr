from langchain_aws import ChatBedrockConverse
from .config import settings


def reasoning_llm() -> ChatBedrockConverse:
    return ChatBedrockConverse(
        model=settings.bedrock_model_reasoning,
        region_name=settings.aws_region,
        temperature=0.3,
        max_tokens=2048,
    )


def router_llm() -> ChatBedrockConverse:
    return ChatBedrockConverse(
        model=settings.bedrock_model_router,
        region_name=settings.aws_region,
        temperature=0.0,
        max_tokens=256,
    )


def vision_llm() -> ChatBedrockConverse:
    return ChatBedrockConverse(
        model=settings.bedrock_model_vision,
        region_name=settings.aws_region,
        temperature=0.4,
        max_tokens=1024,
    )
