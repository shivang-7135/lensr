"""FastAPI entrypoint with SSE streaming."""

from __future__ import annotations

import hmac
import json
import logging
import uuid
from collections.abc import AsyncIterator

logger = logging.getLogger(__name__)

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from .config import settings
from .router_graph import run_stream

app = FastAPI(title="Lensr backend")

# Parse CORS origins — support comma-separated list
_allowed_origins = [o.strip() for o in settings.cors_allow_origin.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["content-type", "authorization", "x-backend-secret"],
)

# --- Constants ---
MAX_QUERY_LENGTH = 2000


class SearchBody(BaseModel):
    query: str = Field(..., max_length=MAX_QUERY_LENGTH)
    intent_hint: str | None = Field(default=None, max_length=100)


def _check_secret(provided: str | None) -> None:
    """Timing-safe comparison for the backend shared secret."""
    expected = settings.backend_shared_secret
    if not expected:
        # No secret configured — allow (local dev only, startup warns)
        return
    if not provided:
        raise HTTPException(401, "Missing authentication")
    # Use hmac.compare_digest for timing-safe comparison
    if not hmac.compare_digest(provided.encode(), expected.encode()):
        raise HTTPException(401, "Bad shared secret")


@app.get("/healthz")
async def healthz():
    return {"ok": True}


@app.post("/search")
async def search(body: SearchBody, x_backend_secret: str | None = Header(default=None)):
    _check_secret(x_backend_secret)
    request_id = str(uuid.uuid4())[:8]

    async def gen() -> AsyncIterator[bytes]:
        try:
            async for evt in run_stream(body.query):
                yield f"data: {json.dumps(evt)}\n\n".encode()
        except Exception as e:  # noqa: BLE001
            logger.exception("Stream error [%s]: %s", request_id, e)
            # Send sanitized error to client — never expose internal details
            yield f"data: {json.dumps({'type': 'error', 'message': 'An error occurred processing your request.', 'request_id': request_id})}\n\n".encode()

    return StreamingResponse(gen(), media_type="text/event-stream")


@app.exception_handler(Exception)
async def all_errors(_req: Request, exc: Exception):
    request_id = str(uuid.uuid4())[:8]
    logger.exception("Unhandled error [%s]: %s", request_id, exc)
    return JSONResponse(
        {"error": "Internal server error", "request_id": request_id},
        status_code=500,
    )
