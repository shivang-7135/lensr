"""AWS Bedrock Titan Embeddings for semantic cache."""

from __future__ import annotations

import json
import logging

import boto3

from ..config import settings

logger = logging.getLogger(__name__)

# Titan Embeddings v2 produces 1024-dimensional vectors
EMBEDDING_DIM = 1024
_MODEL_ID = "amazon.titan-embed-text-v2:0"

# Module-level client (reused across calls)
_client = None


def _get_client():
    global _client
    if _client is None:
        _client = boto3.client(
            "bedrock-runtime",
            region_name=settings.aws_region,
        )
    return _client


async def embed_query(text: str) -> list[float]:
    """Generate embedding vector for a search query using Titan Embeddings v2.

    Returns a 1024-dimensional float vector.
    """
    import asyncio

    def _sync_embed():
        client = _get_client()
        body = json.dumps(
            {
                "inputText": text[:8000],  # Titan max input
                "dimensions": EMBEDDING_DIM,
                "normalize": True,
            }
        )
        response = client.invoke_model(
            modelId=_MODEL_ID,
            body=body,
            contentType="application/json",
            accept="application/json",
        )
        result = json.loads(response["body"].read())
        return result["embedding"]

    # Run in thread pool to avoid blocking the event loop
    loop = asyncio.get_event_loop()
    try:
        embedding = await loop.run_in_executor(None, _sync_embed)
        return embedding
    except Exception as e:
        logger.error("Embedding generation failed: %s", e)
        raise
