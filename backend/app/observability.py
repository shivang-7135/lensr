"""Arize Phoenix observability via OpenTelemetry.

Instruments:
  - All LangChain / LangGraph LLM calls (via openinference-instrumentation-langchain)
  - Manual spans for search, scrape, cache, and synthesis steps

Usage:
  Call setup_tracing() once at startup (in main.py lifespan).
  Use span() context manager or trace_step() decorator for custom spans.

Environment variables:
  PHOENIX_COLLECTOR_ENDPOINT  — OTLP endpoint, e.g. https://app.phoenix.arize.com/v1/traces
                                 Defaults to http://localhost:6006/v1/traces (local Phoenix)
  PHOENIX_API_KEY             — Required for Arize Phoenix cloud; omit for self-hosted
  OTEL_SERVICE_NAME           — Defaults to "lensr-backend"
  TRACING_ENABLED             — Set to "false" to disable (default: "true")
"""

from __future__ import annotations

import logging
import os
from contextlib import contextmanager
from typing import Any

logger = logging.getLogger(__name__)

_tracer = None
_tracing_enabled = False


def setup_tracing() -> None:
    """Call once at startup. Safe to call multiple times (idempotent)."""
    global _tracer, _tracing_enabled

    if os.getenv("TRACING_ENABLED", "true").lower() == "false":
        logger.info("Tracing disabled via TRACING_ENABLED=false")
        return

    endpoint = os.getenv("PHOENIX_COLLECTOR_ENDPOINT", "http://localhost:6006/v1/traces")
    api_key = os.getenv("PHOENIX_API_KEY", "")
    service_name = os.getenv("OTEL_SERVICE_NAME", "lensr-backend")

    try:
        from opentelemetry import trace
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

        # Phoenix cloud requires api_key header; also support Bearer token format
        headers: dict[str, str] = {}
        if api_key:
            headers["api_key"] = api_key            # Arize Phoenix format
            headers["Authorization"] = f"Bearer {api_key}"  # standard OTLP format

        exporter = OTLPSpanExporter(
            endpoint=endpoint,
            headers=headers,
        )
        resource = Resource.create({"service.name": service_name})
        provider = TracerProvider(resource=resource)
        provider.add_span_processor(BatchSpanProcessor(exporter))
        trace.set_tracer_provider(provider)
        _tracer = trace.get_tracer(service_name)

        # Auto-instrument all LangChain LLM calls
        try:
            from openinference.instrumentation.langchain import LangChainInstrumentor
            LangChainInstrumentor().instrument()
            logger.info("LangChain instrumented for Phoenix tracing → %s", endpoint)
        except ImportError:
            logger.warning("openinference-instrumentation-langchain not installed — LLM spans won't appear")

        _tracing_enabled = True
        key_hint = f"{api_key[:8]}…" if len(api_key) > 8 else "(not set)"
        logger.info(
            "Phoenix OTEL tracing enabled → %s (service=%s, api_key=%s)",
            endpoint, service_name, key_hint,
        )

    except Exception as exc:
        logger.warning("Failed to initialise Phoenix tracing (non-fatal): %s", exc)
        _tracing_enabled = False


@contextmanager
def span(name: str, attributes: dict[str, Any] | None = None):
    """Context manager that creates a named span if tracing is enabled.

    Usage:
        async with span("search.fanout", {"query.count": 3}):
            ...
    """
    if not _tracing_enabled or _tracer is None:
        yield None
        return

    from opentelemetry import trace
    from opentelemetry.trace import StatusCode

    with _tracer.start_as_current_span(name) as s:
        if attributes:
            for k, v in attributes.items():
                s.set_attribute(k, v)
        try:
            yield s
        except Exception as exc:
            s.set_status(StatusCode.ERROR, str(exc))
            s.record_exception(exc)
            raise


def get_tracer():
    """Return the configured tracer, or None if tracing is disabled."""
    return _tracer if _tracing_enabled else None
