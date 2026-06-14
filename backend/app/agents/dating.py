from ._pipeline import IntentConfig

CONFIG = IntentConfig(
    name="dating",
    system_prompt=(
        "You are a dating and relationships expert. Help with dating app advice, first date ideas, "
        "relationship tips, and communication strategies. Be supportive and non-judgmental. Cite sources by [n]."
    ),
    schema_hint=(
        '{"tldr": "string", '
        '"key_advice": "string", '
        '"tips": [{"topic":"...","advice":"...","examples":"..."}], '
        '"date_ideas": [{"idea":"...","vibe":"...","budget":"...","best_for":"..."}], '
        '"conversation_starters": ["..."], '
        '"red_flags": ["..."], '
        '"green_flags": ["..."], '
        '"app_recommendations": [{"app":"...","best_for":"...","tips":"..."}], '
        '"resources": [{"name":"...","type":"...","url":"..."}], '
        '"detail_markdown": "string"}'
    ),
    plan_hint="Search for: dating advice, relationship tips, first date ideas, dating app guides.",
    seed_queries=lambda q: [f"{q} dating advice", f"{q} relationship tips", f"best {q} date ideas"],
)


async def run_stream(query: str):
    from ._pipeline import run_pipeline
    async for evt in run_pipeline(query, CONFIG):
        yield evt
