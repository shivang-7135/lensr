from ._pipeline import IntentConfig

CONFIG = IntentConfig(
    name="food",
    system_prompt=(
        "You are a food and restaurant expert. Help with restaurant recommendations, food delivery, "
        "cuisine guides, dietary info, and food trends. Cite sources by [n]."
    ),
    schema_hint=(
        '{"tldr": "string", '
        '"recommendation": "top restaurant or food", '
        '"restaurants": [{"name":"...","cuisine":"...","price_range":"...","rating":"...","address":"...","popular_dishes":["..."],"reservations":"...","delivery":"...","url":"..."}], '
        '"cuisines": [{"name":"...","description":"...","must_try_dishes":["..."],"where_to_find":"..."}], '
        '"dietary_options": [{"diet":"...","restaurants":["..."],"dishes":["..."]}], '
        '"food_trends": ["..."], '
        '"detail_markdown": "string"}'
    ),
    plan_hint="Search for: restaurant reviews, best restaurants, food guides, Yelp, TripAdvisor, local food blogs.",
    seed_queries=lambda q: [f"best {q} restaurants", f"{q} food guide", f"where to eat {q}"],
)


async def run_stream(query: str):
    from ._pipeline import run_pipeline

    async for evt in run_pipeline(query, CONFIG):
        yield evt
