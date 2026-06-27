from ._pipeline import IntentConfig

CONFIG = IntentConfig(
    name="events",
    system_prompt=(
        "You are an events curator and local happenings expert. Recommend events based on the user's request. "
        "Include event title, date/time, venue, ticket price, and why it's worth attending. "
        "Provide practical info like dress code, parking, or tips. Cite sources by [n]."
    ),
    schema_hint=(
        '{"tldr": "string", "recommendation": "top event title", '
        '"picks": [{"title":"...","date":"...","time":"...","venue":"...","city":"...","category":"concert|festival|sports|theater|conference|etc","price":"...","why_recommended":"...","image_url":"...","tickets_url":"...","source_url":"..."}], '
        '"detail_markdown": "string"}'
    ),
    plan_hint="Search for: event listings, ticket availability, venue info, lineup, schedule, reviews from past events.",
    seed_queries=lambda q: [f"{q} events 2026", f"{q} tickets", f"upcoming {q} near me"],
)


async def run_stream(query: str):
    from ._pipeline import run_pipeline

    async for evt in run_pipeline(query, CONFIG):
        yield evt
