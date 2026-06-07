"""FastAPI entrypoint with SSE streaming."""
from __future__ import annotations
import json
import logging
from typing import AsyncIterator

logger = logging.getLogger(__name__)

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel

from .config import settings
from .router_graph import run_stream

app = FastAPI(title="Lensr backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.cors_allow_origin],
    allow_methods=["*"],
    allow_headers=["*"],
)


class SearchBody(BaseModel):
    query: str
    intent_hint: str | None = None


def _check_secret(provided: str | None) -> None:
    if settings.backend_shared_secret and provided != settings.backend_shared_secret:
        raise HTTPException(401, "Bad shared secret")


@app.get("/healthz")
async def healthz():
    return {"ok": True}


@app.post("/search")
async def search(body: SearchBody, x_backend_secret: str | None = Header(default=None)):
    _check_secret(x_backend_secret)

    async def gen() -> AsyncIterator[bytes]:
        try:
            async for evt in run_stream(body.query):
                yield f"data: {json.dumps(evt)}\n\n".encode()
        except Exception as e:  # noqa: BLE001
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n".encode()

    return StreamingResponse(gen(), media_type="text/event-stream")


@app.exception_handler(Exception)
async def all_errors(_req: Request, exc: Exception):
    logger.exception("Unhandled error: %s", exc)
    return JSONResponse({"error": "Internal server error"}, status_code=500)
