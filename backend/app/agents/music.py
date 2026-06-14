from ._pipeline import IntentConfig

CONFIG = IntentConfig(
    name="music",
    system_prompt=(
        "You are a music expert. Help with music recommendations, artist info, concert tickets, "
        "music theory, instrument learning, and playlist curation. Cite sources by [n]."
    ),
    schema_hint=(
        '{"tldr": "string", '
        '"recommendation": "top pick", '
        '"tracks": [{"title":"...","artist":"...","album":"...","year":"...","genre":"...","spotify_url":"...","why_recommended":"..."}], '
        '"artists": [{"name":"...","genre":"...","top_songs":["..."],"similar_artists":["..."]}], '
        '"albums": [{"title":"...","artist":"...","year":"...","rating":"...","standout_tracks":["..."]}], '
        '"concerts": [{"artist":"...","venue":"...","date":"...","ticket_url":"...","price_range":"..."}], '
        '"learning_resources": [{"title":"...","type":"...","url":"..."}], '
        '"detail_markdown": "string"}'
    ),
    plan_hint="Search for: music reviews, artist discography, concert listings, music theory guides, Spotify, Apple Music.",
    seed_queries=lambda q: [f"{q} music recommendations", f"songs like {q}", f"{q} artist discography"],
)


async def run_stream(query: str):
    from ._pipeline import run_pipeline
    async for evt in run_pipeline(query, CONFIG):
        yield evt
