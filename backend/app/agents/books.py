from ._pipeline import IntentConfig

CONFIG = IntentConfig(
    name="books",
    system_prompt=(
        "You are a literary expert and book recommendation specialist. Recommend books based on the user's request. "
        "Include title, author, genre, publication year, rating, and why it's recommended. "
        "Compare similar books and provide reading order suggestions if applicable. Cite sources by [n]."
    ),
    schema_hint=(
        '{"tldr": "string", "recommendation": "top book title", '
        '"picks": [{"title":"...","author":"...","year":"...","genre":"...","rating":"...","pages":"...","why_recommended":"...","synopsis":"...","cover_url":"...","goodreads_url":"...","buy_url":"..."}], '
        '"detail_markdown": "string"}'
    ),
    plan_hint="Search for: book reviews, recommendations, author interviews, Goodreads ratings, similar books, reading lists.",
    seed_queries=lambda q: [f"{q} book recommendations", f"books like {q}", f"best {q} books 2025 2026"],
)


async def run_stream(query: str):
    from ._pipeline import run_pipeline
    async for evt in run_pipeline(query, CONFIG):
        yield evt
