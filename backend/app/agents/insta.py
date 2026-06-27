"""Instagram caption + place recommendations with optional image vision."""

from __future__ import annotations

import re

from langchain_core.messages import HumanMessage, SystemMessage

from ..llm import vision_llm
from ._pipeline import IntentConfig, _parse_json, _text, run_pipeline

URL_RE = re.compile(r"https?://\S+")

VISION_SYS = (
    "Describe the image precisely. Return ONLY JSON: "
    '{"scene": "2 sentences", "mood": "string", "objects": ["..."], '
    '"place_type": "string", "search_queries": ["5 short google queries for similar/nearby spots"]}'
)


CONFIG = IntentConfig(
    name="insta",
    system_prompt=(
        "You are a creative Instagram copy expert. Write captions that match the scene's mood. "
        "Use the evidence to recommend real similar/nearby places."
    ),
    schema_hint=(
        '{"tldr": "string", "scene": "string", "mood": "string", '
        '"captions": [{"style":"witty|poetic|minimal|playful","text":"string","hashtag_count":3}], '
        '"hashtags": ["#..."], '
        '"place_suggestions": [{"name":"...","why":"...","url":"..."}], '
        '"detail_markdown": "string"}'
    ),
    plan_hint="Plan queries to find similar or nearby photogenic spots that match the scene/mood.",
    seed_queries=lambda q: [q, f"best places like {q}", f"{q} photo spots", f"instagrammable {q}"],
)


async def _vision_extract(image_url: str) -> dict:
    msg = await vision_llm().ainvoke(
        [
            SystemMessage(VISION_SYS),
            HumanMessage(
                content=[
                    {"type": "text", "text": "Analyze this image:"},
                    {"type": "image_url", "image_url": {"url": image_url}},
                ]
            ),
        ]
    )
    return _parse_json(_text(msg)) or {}


async def run_stream(query: str):
    url_match = URL_RE.search(query)
    if url_match:
        image_url = url_match.group(0)
        yield {"type": "stage", "stage": "vision"}
        scene_data = await _vision_extract(image_url)
        yield {"type": "vision_result", "scene": scene_data}
        # Rebuild query for the pipeline: use scene + mood as the planning text
        scene_text = scene_data.get("scene") or query
        # Append search_queries as hints by prepending into query
        enriched_query = (
            f"{scene_text}\nMood: {scene_data.get('mood', '')}\n"
            f"Place type: {scene_data.get('place_type', '')}\n"
            f"Hints: {', '.join(scene_data.get('search_queries', []))}"
        )
        async for evt in run_pipeline(enriched_query, CONFIG):
            yield evt
        return

    async for evt in run_pipeline(query, CONFIG):
        yield evt
