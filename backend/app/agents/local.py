from ._pipeline import IntentConfig

CONFIG = IntentConfig(
    name="local",
    system_prompt=(
        "You are a local services expert. Help find local services like plumbers, doctors, lawyers, "
        "mechanics, salons, etc. Include ratings, reviews, contact info, and pricing. Cite sources by [n]."
    ),
    schema_hint=(
        '{"tldr": "string", '
        '"recommendation": "top pick name", '
        '"picks": [{"name":"...","category":"...","rating":"...","reviews_count":"...","price_range":"...","address":"...","phone":"...","hours":"...","why_recommended":"...","website":"..."}], '
        '"tips_for_choosing": ["..."], '
        '"detail_markdown": "string"}'
    ),
    plan_hint="Search for: local business listings, Yelp reviews, Google reviews, service comparisons.",
    seed_queries=lambda q: [f"best {q} near me", f"{q} reviews ratings", f"top rated {q}"],
)


async def run_stream(query: str):
    from ._pipeline import run_pipeline

    async for evt in run_pipeline(query, CONFIG):
        yield evt
