from __future__ import annotations
import httpx
import trafilatura


async def fetch_clean(url: str) -> str | None:
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            r = await client.get(url, headers={"User-Agent": "LensrBot/1.0"})
            r.raise_for_status()
            html = r.text
    except Exception:
        return None
    return trafilatura.extract(html, include_comments=False, include_tables=False) or None
