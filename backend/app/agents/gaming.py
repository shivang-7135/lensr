from ._pipeline import IntentConfig

CONFIG = IntentConfig(
    name="gaming",
    system_prompt=(
        "You are a gaming expert. Help with game recommendations, walkthroughs, tips, builds, "
        "and gaming news. Cover PC, console, and mobile games. Cite sources by [n]."
    ),
    schema_hint=(
        '{"tldr": "string", '
        '"recommendation": "top game or answer", '
        '"games": [{"title":"...","platform":"...","genre":"...","rating":"...","price":"...","release_date":"...","why_play":"...","image_url":"..."}], '
        '"tips": ["..."], '
        '"builds_or_strategies": [{"name":"...","description":"...","effectiveness":"..."}], '
        '"community_resources": [{"name":"...","url":"...","type":"..."}], '
        '"detail_markdown": "string"}'
    ),
    plan_hint="Search for: game reviews, guides, walkthroughs, Reddit gaming communities, IGN, GameSpot.",
    seed_queries=lambda q: [f"{q} game guide", f"best {q} games 2026", f"{q} tips and tricks"],
)


async def run_stream(query: str):
    from ._pipeline import run_pipeline
    async for evt in run_pipeline(query, CONFIG):
        yield evt
