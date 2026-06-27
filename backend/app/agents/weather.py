from ._pipeline import IntentConfig

CONFIG = IntentConfig(
    name="weather",
    system_prompt=(
        "You are a weather expert. Provide weather forecasts, travel weather advice, seasonal "
        "information, and climate data. Help users plan activities based on weather. Cite sources by [n]."
    ),
    schema_hint=(
        '{"tldr": "string", '
        '"location": "string", '
        '"current": {"temp":"...","condition":"...","humidity":"...","wind":"..."}, '
        '"forecast": [{"day":"...","high":"...","low":"...","condition":"...","precipitation":"..."}], '
        '"best_time_to_visit": "string", '
        '"packing_suggestions": ["..."], '
        '"weather_alerts": ["..."], '
        '"activity_recommendations": [{"activity":"...","best_conditions":"...","timing":"..."}], '
        '"detail_markdown": "string"}'
    ),
    plan_hint="Search for: weather forecast, climate data, best time to visit, seasonal weather patterns.",
    seed_queries=lambda q: [f"{q} weather forecast", f"best time to visit {q}", f"{q} climate and seasons"],
)


async def run_stream(query: str):
    from ._pipeline import run_pipeline

    async for evt in run_pipeline(query, CONFIG):
        yield evt
