"""Top-level LangGraph: classify intent, dispatch to per-intent subgraph."""
from __future__ import annotations
from typing import AsyncIterator, Literal, TypedDict
import json

from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, SystemMessage

from .llm import router_llm
from .agents import shopping, price_history, trip, insta, general

Intent = Literal["shopping", "price_history", "trip", "insta", "general"]


class RouterState(TypedDict, total=False):
    query: str
    intent: Intent
    answer: str
    sources: list[dict]


CLASSIFY_PROMPT = """Classify the user's search query into exactly one intent.
Return ONLY a JSON object: {"intent": "<one of: shopping | price_history | trip | insta | general>"}.
Rules:
- shopping: comparing products, "best X", reviews, buying guidance
- price_history: price tracking, historical pricing, when to buy
- trip: travel plans, itineraries, destination ideas
- insta: photo captions, hashtags, Instagram place recommendations
- general: anything else
"""


async def classify_node(state: RouterState) -> RouterState:
    llm = router_llm()
    msg = await llm.ainvoke([
        SystemMessage(CLASSIFY_PROMPT),
        HumanMessage(state["query"]),
    ])
    raw = msg.content if isinstance(msg.content, str) else str(msg.content)
    try:
        intent = json.loads(raw.strip().splitlines()[-1])["intent"]
    except Exception:
        intent = "general"
    if intent not in ("shopping", "price_history", "trip", "insta", "general"):
        intent = "general"
    return {"intent": intent}


def build() -> StateGraph:
    g = StateGraph(RouterState)
    g.add_node("classify", classify_node)
    g.add_node("shopping", shopping.run)
    g.add_node("price_history", price_history.run)
    g.add_node("trip", trip.run)
    g.add_node("insta", insta.run)
    g.add_node("general", general.run)
    g.set_entry_point("classify")
    g.add_conditional_edges("classify", lambda s: s["intent"], {
        "shopping": "shopping",
        "price_history": "price_history",
        "trip": "trip",
        "insta": "insta",
        "general": "general",
    })
    for n in ("shopping", "price_history", "trip", "insta", "general"):
        g.add_edge(n, END)
    return g.compile()


GRAPH = build()


async def run_stream(query: str) -> AsyncIterator[dict]:
    """Drive the graph and emit SSE-shaped events."""
    state: RouterState = {"query": query}
    async for event in GRAPH.astream_events(state, version="v2"):
        kind = event.get("event")
        name = event.get("name", "")
        if kind == "on_chain_end" and name == "classify":
            yield {"type": "intent_detected", "intent": event["data"]["output"]["intent"]}
        elif kind == "on_tool_start":
            yield {"type": "tool_call", "tool": name, "input": str(event["data"].get("input", ""))[:200]}
        elif kind == "on_tool_end":
            yield {"type": "tool_result", "tool": name, "summary": str(event["data"].get("output", ""))[:200]}
        elif kind == "on_chat_model_stream":
            chunk = event["data"].get("chunk")
            text = getattr(chunk, "content", "") or ""
            if isinstance(text, list):
                text = "".join(p.get("text", "") if isinstance(p, dict) else str(p) for p in text)
            if text:
                yield {"type": "partial_answer", "delta": text}

    # final snapshot
    snapshot = await GRAPH.ainvoke(state)
    yield {
        "type": "final",
        "intent": snapshot.get("intent", "general"),
        "markdown": snapshot.get("answer", ""),
        "sources": snapshot.get("sources", []),
    }
