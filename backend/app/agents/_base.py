"""Shared building blocks for per-intent agents."""
from __future__ import annotations
from typing import TypedDict
from langchain_core.messages import HumanMessage, SystemMessage

from ..llm import reasoning_llm
from ..tools.serper import google_search


class AgentState(TypedDict, total=False):
    query: str
    answer: str
    sources: list[dict]


async def search_then_answer(query: str, system_prompt: str, search_queries: list[str]) -> AgentState:
    sources: list[dict] = []
    seen = set()
    for q in search_queries:
        for r in await google_search(q, num=5):
            if r["link"] in seen:
                continue
            seen.add(r["link"])
            sources.append({"title": r["title"], "url": r["link"], "snippet": r.get("snippet", "")})

    context = "\n\n".join(f"- {s['title']}\n  {s['url']}\n  {s.get('snippet','')}" for s in sources[:12])
    llm = reasoning_llm()
    msg = await llm.ainvoke([
        SystemMessage(system_prompt),
        HumanMessage(f"User query: {query}\n\nWeb context:\n{context}"),
    ])
    text = msg.content if isinstance(msg.content, str) else "".join(
        p.get("text", "") if isinstance(p, dict) else str(p) for p in msg.content
    )
    return {"answer": text, "sources": [{"title": s["title"], "url": s["url"]} for s in sources[:8]]}
