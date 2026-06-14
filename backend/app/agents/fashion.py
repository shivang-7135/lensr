from ._pipeline import IntentConfig

CONFIG = IntentConfig(
    name="fashion",
    system_prompt=(
        "You are a fashion and style expert. Help with outfit ideas, trend reports, brand recommendations, "
        "and personal styling advice. Cover clothing, accessories, and grooming. Cite sources by [n]."
    ),
    schema_hint=(
        '{"tldr": "string", '
        '"recommendation": "top style tip or item", '
        '"outfit_ideas": [{"occasion":"...","items":["..."],"style_tip":"...","image_url":"..."}], '
        '"trending": [{"trend":"...","description":"...","how_to_wear":"..."}], '
        '"products": [{"name":"...","brand":"...","price":"...","where_to_buy":"...","url":"..."}], '
        '"style_tips": ["..."], '
        '"brands_to_know": [{"name":"...","style":"...","price_range":"...","known_for":"..."}], '
        '"detail_markdown": "string"}'
    ),
    plan_hint="Search for: fashion trends, style guides, outfit ideas, brand reviews, Vogue, GQ, fashion blogs.",
    seed_queries=lambda q: [f"{q} fashion trends 2026", f"{q} outfit ideas", f"best {q} style guide"],
)


async def run_stream(query: str):
    from ._pipeline import run_pipeline
    async for evt in run_pipeline(query, CONFIG):
        yield evt
