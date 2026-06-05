"""Instagram caption + place recommendations.

If the query includes an image URL, the vision model describes the scene. Otherwise
we fall back to text-only caption suggestions. Place lookup uses Serper.
"""
from __future__ import annotations
import re
from langchain_core.messages import HumanMessage, SystemMessage
from ._base import AgentState
from ..llm import vision_llm, reasoning_llm
from ..tools.serper import google_search

URL_RE = re.compile(r"https?://\S+")

VISION_SYS = (
    "Describe the scene in 2 short sentences (place type, mood, key objects). "
    "Then on a new line, output 5 short Google search queries to find similar/nearby spots. "
    "Format:\nSCENE: ...\nQUERIES:\n- ...\n- ..."
)

CAPTION_SYS = (
    "Write 3 Instagram caption options (Witty / Poetic / Minimal) and 8 relevant hashtags. "
    "Markdown only. Keep each caption under 200 chars."
)


async def run(state) -> AgentState:
    q = state["query"]
    url_match = URL_RE.search(q)
    scene = q
    queries: list[str] = [q]

    if url_match:
        vllm = vision_llm()
        msg = await vllm.ainvoke([
            SystemMessage(VISION_SYS),
            HumanMessage(content=[
                {"type": "text", "text": "Analyze this image:"},
                {"type": "image_url", "image_url": {"url": url_match.group(0)}},
            ]),
        ])
        text = msg.content if isinstance(msg.content, str) else str(msg.content)
        scene = text.split("QUERIES:")[0].replace("SCENE:", "").strip() or q
        if "QUERIES:" in text:
            queries = [
                line.lstrip("-• ").strip()
                for line in text.split("QUERIES:")[1].splitlines()
                if line.strip().startswith(("-", "•"))
            ][:5] or [q]

    # Caption
    cap_msg = await reasoning_llm().ainvoke([
        SystemMessage(CAPTION_SYS),
        HumanMessage(f"Scene: {scene}"),
    ])
    captions = cap_msg.content if isinstance(cap_msg.content, str) else str(cap_msg.content)

    # Places
    sources: list[dict] = []
    seen = set()
    for sq in queries[:3]:
        for r in await google_search(sq, num=4):
            if r["link"] in seen:
                continue
            seen.add(r["link"])
            sources.append({"title": r["title"], "url": r["link"]})

    places_md = "\n".join(f"- [{s['title']}]({s['url']})" for s in sources[:6])
    answer = f"## Scene\n{scene}\n\n## Captions & hashtags\n{captions}\n\n## Place ideas\n{places_md or '_No place suggestions found._'}"
    return {"answer": answer, "sources": sources[:6]}
