from __future__ import annotations

import ipaddress
import logging
from urllib.parse import urlparse

import httpx
import trafilatura

logger = logging.getLogger(__name__)

# Maximum response body size (5 MB)
MAX_RESPONSE_BYTES = 5 * 1024 * 1024


def _is_private_url(url: str) -> bool:
    """Block requests to private/internal network addresses (SSRF protection)."""
    try:
        parsed = urlparse(url)
        hostname = parsed.hostname
        if not hostname:
            return True
        # Block common internal hostnames
        if hostname in ("localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"):
            return True
        # Block metadata endpoints
        if hostname == "169.254.169.254":
            return True
        # Try to resolve as IP and check ranges
        try:
            ip = ipaddress.ip_address(hostname)
            return ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved
        except ValueError:
            # It's a hostname, not an IP — allow (DNS resolution happens at request time)
            pass
        # Block cloud metadata hostnames
        return hostname in ("metadata.google.internal", "metadata.internal")
    except Exception:
        return True  # Block on any parsing error


async def fetch_clean(url: str) -> str | None:
    """Fetch and extract main text content from a URL.

    Includes SSRF protection and response size limiting.
    """
    if _is_private_url(url):
        logger.warning("Blocked SSRF attempt: %s", url)
        return None

    try:
        async with httpx.AsyncClient(
            timeout=4,  # Hard 4s cap — slow pages are skipped, not waited on
            follow_redirects=True,
            max_redirects=2,
        ) as client:
            r = await client.get(url, headers={"User-Agent": "LensrBot/1.0"})
            r.raise_for_status()
            # Enforce response size limit
            content_length = r.headers.get("content-length")
            if content_length and int(content_length) > MAX_RESPONSE_BYTES:
                logger.warning("Response too large (%s bytes): %s", content_length, url)
                return None
            if len(r.content) > MAX_RESPONSE_BYTES:
                logger.warning("Response body exceeded limit: %s", url)
                return None
            html = r.text
    except httpx.TimeoutException:
        logger.debug("Timeout fetching: %s", url)
        return None
    except httpx.HTTPStatusError as e:
        logger.debug("HTTP %d fetching: %s", e.response.status_code, url)
        return None
    except Exception as e:
        logger.debug("Error fetching %s: %s", url, type(e).__name__)
        return None

    return trafilatura.extract(html, include_comments=False, include_tables=False) or None
