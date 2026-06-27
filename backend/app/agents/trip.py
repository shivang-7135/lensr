from ._pipeline import IntentConfig

CONFIG = IntentConfig(
    name="trip",
    system_prompt=(
        "You are a senior trip planner. Build a concrete, walkable, realistic itinerary grounded in the evidence. "
        "Prefer specific venues over generic advice. Include transport tips between activities."
    ),
    schema_hint=(
        '{"tldr": "string", "destination": "string", "best_time_to_visit": "string", '
        '"days": [{"day":1,"theme":"...","morning":"...","afternoon":"...","evening":"...",'
        '"food":"...","transport_tip":"..."}], '
        '"budget_hint": "string", "packing_tips": ["..."], '
        '"detail_markdown": "string"}'
    ),
    plan_hint="Mix queries for: top things to do, best neighborhoods, transport, food, best time to visit, sample itineraries.",
    seed_queries=lambda q: [
        f"things to do {q}",
        f"{q} best neighborhoods",
        f"{q} itinerary 3 days",
        f"best time to visit {q}",
        f"{q} local food",
    ],
)


async def run_stream(query: str):
    from ._pipeline import run_pipeline

    async for evt in run_pipeline(query, CONFIG):
        yield evt
