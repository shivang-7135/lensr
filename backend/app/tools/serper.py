"""Serper.dev wrapper — real Google SERPs as JSON."""

from __future__ import annotations

import logging

import httpx

from ..config import settings

logger = logging.getLogger(__name__)


async def google_search(query: str, num: int = 5) -> list[dict]:
    if not settings.serper_api_key:
        logger.warning("google_search called but SERPER_API_KEY is not set — returning empty")
        return []

    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.post(
                "https://google.serper.dev/search",
                headers={"X-API-KEY": settings.serper_api_key, "Content-Type": "application/json"},
                json={"q": query, "num": num},
            )
            r.raise_for_status()
            data = r.json()
    except httpx.HTTPStatusError as e:
        logger.error("Serper API error %d for query '%s': %s", e.response.status_code, query, e.response.text[:200])
        return []
    except httpx.TimeoutException:
        logger.error("Serper API timeout for query: '%s'", query)
        return []
    except Exception as e:
        logger.error("Serper API unexpected error for query '%s': %s", query, type(e).__name__)
        return []

    organic = data.get("organic", [])
    return [{"title": it.get("title"), "link": it.get("link"), "snippet": it.get("snippet")} for it in organic[:num]]
