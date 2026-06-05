"""Serper.dev wrapper — real Google SERPs as JSON."""
from __future__ import annotations
import httpx
from ..config import settings


async def google_search(query: str, num: int = 8) -> list[dict]:
    if not settings.serper_api_key:
        return []
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(
            "https://google.serper.dev/search",
            headers={"X-API-KEY": settings.serper_api_key, "Content-Type": "application/json"},
            json={"q": query, "num": num},
        )
        r.raise_for_status()
        data = r.json()
    organic = data.get("organic", [])
    return [
        {"title": it.get("title"), "link": it.get("link"), "snippet": it.get("snippet")}
        for it in organic[:num]
    ]
