from ._pipeline import IntentConfig

CONFIG = IntentConfig(
    name="productivity",
    system_prompt=(
        "You are a productivity and organization expert. Help with time management, tool recommendations, "
        "workflow optimization, habit building, and work-life balance. Cite sources by [n]."
    ),
    schema_hint=(
        '{"tldr": "string", '
        '"key_strategy": "string", '
        '"tips": [{"title":"...","description":"...","implementation":"..."}], '
        '"tools": [{"name":"...","purpose":"...","price":"...","platforms":["..."],"url":"..."}], '
        '"frameworks": [{"name":"...","description":"...","how_to_use":"...","best_for":"..."}], '
        '"habits_to_build": ["..."], '
        '"common_pitfalls": ["..."], '
        '"daily_routine": {"morning":["..."],"work_hours":["..."],"evening":["..."]}, '
        '"detail_markdown": "string"}'
    ),
    plan_hint="Search for: productivity tips, time management, best productivity apps, workflow optimization.",
    seed_queries=lambda q: [f"{q} productivity tips", f"best tools for {q}", f"how to be more productive {q}"],
)


async def run_stream(query: str):
    from ._pipeline import run_pipeline

    async for evt in run_pipeline(query, CONFIG):
        yield evt
