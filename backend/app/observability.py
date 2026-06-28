"""Arize Phoenix observability via phoenix.otel.register().

Instruments:
  - All LangChain LLM calls automatically (via openinference-instrumentation-langchain)
  - Manual spans for search, scrape, cache, and synthesis steps

Environment variables (set on Fly.io via flyctl secrets set):
  PHOENIX_API_KEY             — API key from app.phoenix.arize.com → Settings → API Keys
  PHOENIX_COLLECTOR_ENDPOINT  — e.g. https://app.phoenix.arize.com (just the base, no path)
  PHOENIX_PROJECT_NAME        — Project to send traces to (default: "lensr")
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

    api_key = os.getenv("PHOENIX_API_KEY", "")
    # Base URL — no path suffix needed, register() appends /v1/traces automatically
    collector_endpoint = os.getenv("PHOENIX_COLLECTOR_ENDPOINT", "https://app.phoenix.arize.com")
    project_name = os.getenv("PHOENIX_PROJECT_NAME", "lensr")

    if not api_key:
        logger.warning("PHOENIX_API_KEY not set — tracing disabled")
        return

    try:
        from phoenix.otel import register

        # register() handles all OTLP setup + auth headers for Arize Phoenix cloud
        tracer_provider = register(
            project_name=project_name,
            endpoint=f"{collector_endpoint.rstrip('/')}/v1/traces",
            headers={"api_key": api_key},
            set_global_tracer_provider=True,
            verbose=False,
        )

        from opentelemetry import trace
        _tracer = trace.get_tracer(project_name)

        # Auto-instrument all LangChain LLM calls
        try:
            from openinference.instrumentation.langchain import LangChainInstrumentor
            LangChainInstrumentor().instrument(tracer_provider=tracer_provider)
            logger.info("LangChain instrumented for Phoenix tracing")
        except ImportError:
            logger.warning("openinference-instrumentation-langchain not installed")

        _tracing_enabled = True
        key_hint = f"{api_key[:8]}…" if len(api_key) > 8 else "???"
        logger.info(
            "Phoenix tracing active → project=%s endpoint=%s key=%s",
            project_name, collector_endpoint, key_hint,
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
