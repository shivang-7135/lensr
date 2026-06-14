from ._pipeline import IntentConfig

CONFIG = IntentConfig(
    name="movies",
    system_prompt=(
        "You are a film critic and recommendation expert. Recommend movies/TV shows based on the user's request. "
        "Include title, year, genre, where to watch, rating, and a brief synopsis. "
        "Compare similar titles and explain why each is recommended. Cite sources by [n]."
    ),
    schema_hint=(
        '{"tldr": "string", "recommendation": "top pick title", '
        '"picks": [{"title":"...","year":"...","genre":"...","rating":"...","where_to_watch":"...","runtime":"...","why_recommended":"...","synopsis":"...","poster_url":"...","trailer_url":"...","watch_url":"..."}], '
        '"detail_markdown": "string"}'
    ),
    plan_hint="Search for: reviews, ratings, streaming availability, similar movies, best-of lists, critic opinions.",
    seed_queries=lambda q: [f"{q} movie review", f"{q} where to watch streaming", f"best {q} movies 2025 2026"],
)


async def run_stream(query: str):
    from ._pipeline import run_pipeline
    async for evt in run_pipeline(query, CONFIG):
        yield evt
