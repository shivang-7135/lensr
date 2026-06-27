from ._pipeline import IntentConfig

CONFIG = IntentConfig(
    name="places",
    system_prompt=(
        "You are a local expert and restaurant/venue guide. Recommend places based on the user's request. "
        "Include name, category, price level, rating, location, hours, and must-try items. "
        "Provide neighborhood context and practical tips. Cite sources by [n]."
    ),
    schema_hint=(
        '{"tldr": "string", "recommendation": "top place name", '
        '"picks": [{"name":"...","category":"restaurant|cafe|bar|attraction|shop|etc","price_level":"$|$$|$$$|$$$$","rating":"...","address":"...","neighborhood":"...","hours":"...","why_recommended":"...","must_try":["..."],"image_url":"...","maps_url":"...","website_url":"..."}], '
        '"detail_markdown": "string"}'
    ),
    plan_hint="Search for: reviews, ratings, Yelp/TripAdvisor, local guides, opening hours, menu highlights, reservations.",
    seed_queries=lambda q: [f"{q} reviews", f"best {q} near me", f"{q} recommendations 2026"],
)


async def run_stream(query: str):
    from ._pipeline import run_pipeline

    async for evt in run_pipeline(query, CONFIG):
        yield evt
