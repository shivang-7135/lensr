"""Top-level router: classify intent, dispatch to the adaptive per-intent pipeline."""
from __future__ import annotations
from typing import AsyncIterator, Literal
import json

from langchain_core.messages import HumanMessage, SystemMessage

from .llm import router_llm
from .agents import shopping, price_history, trip, insta, general

Intent = Literal["shopping", "price_history", "trip", "insta", "general"]

CLASSIFY_SYS = (
    "Classify the user's search query into exactly one intent. "
    'Return ONLY JSON: {"intent": "shopping|price_history|trip|insta|general"}.\n'
    "- shopping: comparing products, 'best X', reviews, buying guidance\n"
    "- price_history: price tracking, when to buy, sale windows\n"
    "- trip: travel plans, itineraries, destination ideas\n"
    "- insta: captions, hashtags, photo spots, image analysis\n"
    "- general: everything else"
)

DISPATCH = {
    "shopping": shopping.run_stream,
    "price_history": price_history.run_stream,
    "trip": trip.run_stream,
    "insta": insta.run_stream,
    "general": general.run_stream,
}


async def _classify(query: str) -> Intent:
    msg = await router_llm().ainvoke([SystemMessage(CLASSIFY_SYS), HumanMessage(query)])
    raw = msg.content if isinstance(msg.content, str) else "".join(
        p.get("text", "") if isinstance(p, dict) else str(p) for p in msg.content
    )
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```", 2)[1].lstrip("json").strip().rsplit("```", 1)[0]
    try:
        intent = json.loads(raw).get("intent")
    except Exception:
        intent = "general"
    if intent not in DISPATCH:
        intent = "general"
    return intent  # type: ignore[return-value]


async def run_stream(query: str) -> AsyncIterator[dict]:
    intent = await _classify(query)
    yield {"type": "intent_detected", "intent": intent}
    async for evt in DISPATCH[intent](query):
        yield evt
