"""Semantic search cache using Supabase pgvector.

Flow:
1. On each query, generate embedding via Titan Embeddings.
2. Check pgvector for similar cached results (cosine similarity > threshold).
3. If cache hit → return immediately (skip entire pipeline).
4. If cache miss → run pipeline, then store result + embedding for future queries.
"""

from __future__ import annotations

import json
import logging
from datetime import UTC, datetime, timedelta

from ..config import settings
from ..observability import span
from .embeddings import embed_query

logger = logging.getLogger(__name__)


def _cache_enabled() -> bool:
    if not settings.cache_enabled:
        return False
    if not settings.database_url:
        logger.warning("Semantic cache disabled: DATABASE_URL is not set.")
        return False
    if "user:pass@localhost" in settings.database_url:
        logger.warning("Semantic cache disabled: DATABASE_URL is still the placeholder value.")
        return False
    return True


def _similarity_threshold() -> float:
    return settings.cache_similarity_threshold


def _ttl_hours() -> int:
    return settings.cache_ttl_hours


def _get_supabase_url() -> str | None:
    """Get Supabase URL from environment or database URL."""
    # The backend can call the frontend's /api/public/backend-keys to get Supabase creds,
    # or we can use the DATABASE_URL directly with pgvector SQL.
    return settings.database_url


async def cache_lookup(query: str) -> dict | None:
    """Check if a semantically similar query exists in cache.

    Returns cached result dict if found, None otherwise.
    Fast path: exact normalized match first, then vector similarity.
    """
    if not _cache_enabled():
        return None

    normalized = query.strip().lower()

    try:
        import psycopg

        # Fast path: exact text match (no embedding needed)
        with span("cache.lookup", {"cache.query": query[:100], "cache.type": "exact"}):
          async with await psycopg.AsyncConnection.connect(settings.database_url) as conn, conn.cursor() as cur:
            await cur.execute(
                """
                    SELECT id, query, intent, structured, markdown, sources
                    FROM public.search_cache
                    WHERE query_normalized = %s AND expires_at > now()
                    LIMIT 1
                    """,
                (normalized,),
            )
            row = await cur.fetchone()
            if row:
                # Bump hit count in background (non-blocking)
                await cur.execute(
                    "UPDATE public.search_cache SET hit_count = hit_count + 1 WHERE id = %s",
                    (row[0],),
                )
                await conn.commit()
                logger.info("Cache HIT (exact match) for: '%s'", query[:50])
                return {
                    "intent": row[2],
                    "structured": row[3] if isinstance(row[3], dict) else json.loads(row[3]),
                    "markdown": row[4] or "",
                    "sources": row[5] if isinstance(row[5], list) else json.loads(row[5] or "[]"),
                }

        # Slow path: semantic similarity via embedding
        embedding = await embed_query(query)
        embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"

        async with await psycopg.AsyncConnection.connect(settings.database_url) as conn, conn.cursor() as cur:
            await cur.execute(
                """
                    SELECT id, query, intent, structured, markdown, sources,
                           1 - (embedding <=> %s::vector) AS similarity
                    FROM public.search_cache
                    WHERE expires_at > now()
                        AND embedding IS NOT NULL
                        AND 1 - (embedding <=> %s::vector) > %s
                    ORDER BY embedding <=> %s::vector
                    LIMIT 1
                    """,
                (embedding_str, embedding_str, _similarity_threshold(), embedding_str),
            )
            row = await cur.fetchone()
            if row:
                similarity = row[6]
                await cur.execute(
                    "UPDATE public.search_cache SET hit_count = hit_count + 1 WHERE id = %s",
                    (row[0],),
                )
                await conn.commit()
                logger.info(
                    "Cache HIT (similarity=%.3f) for: '%s' → matched: '%s'",
                    similarity,
                    query[:50],
                    row[1][:50],
                )
                return {
                    "intent": row[2],
                    "structured": row[3] if isinstance(row[3], dict) else json.loads(row[3]),
                    "markdown": row[4] or "",
                    "sources": row[5] if isinstance(row[5], list) else json.loads(row[5] or "[]"),
                }

        logger.debug("Cache MISS for: '%s'", query[:50])
        return None

    except Exception as e:
        # Cache failures should never block the pipeline
        logger.warning("Cache lookup failed (non-fatal): %s: %s", type(e).__name__, e)
        return None


async def cache_store(
    query: str,
    intent: str,
    structured: dict,
    markdown: str,
    sources: list[dict],
) -> None:
    """Store a pipeline result in the semantic cache.

    Generates embedding and stores with TTL. Fire-and-forget — errors are logged but not raised.
    """
    if not _cache_enabled():
        return

    try:
        # Generate embedding for the query
        embedding = await embed_query(query)
        embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"
        normalized = query.strip().lower()
        expires_at = datetime.now(UTC) + timedelta(hours=_ttl_hours())

        import psycopg

        async with await psycopg.AsyncConnection.connect(settings.database_url) as conn, conn.cursor() as cur:
            await cur.execute(
                """
                    INSERT INTO public.search_cache
                        (query, query_normalized, embedding, intent, structured, markdown, sources, expires_at)
                    VALUES (%s, %s, %s::vector, %s, %s::jsonb, %s, %s::jsonb, %s)
                    ON CONFLICT (query_normalized)
                    DO UPDATE SET
                        embedding = EXCLUDED.embedding,
                        intent = EXCLUDED.intent,
                        structured = EXCLUDED.structured,
                        markdown = EXCLUDED.markdown,
                        sources = EXCLUDED.sources,
                        expires_at = EXCLUDED.expires_at,
                        hit_count = 0
                    """,
                (
                    query,
                    normalized,
                    embedding_str,
                    intent,
                    json.dumps(structured),
                    markdown,
                    json.dumps(sources),
                    expires_at,
                ),
            )
            await conn.commit()
        logger.info("Cached result for: '%s' (intent=%s, TTL=%dh)", query[:50], intent, _ttl_hours())

    except Exception as e:
        # Cache store failures should never break the pipeline
        logger.warning("Cache store failed (non-fatal): %s", e)
