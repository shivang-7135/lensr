from ._pipeline import IntentConfig

CONFIG = IntentConfig(
    name="gift",
    system_prompt=(
        "You are a gift idea curator. Suggest thoughtful, creative gift ideas based on recipient, "
        "occasion, budget, and interests. Include price ranges, where to buy, and personalization tips. "
        "Cite sources by [n]."
    ),
    schema_hint=(
        '{"tldr": "string", '
        '"recommendation": "top gift idea", '
        '"picks": [{"name":"...","price_range":"...","best_for":"...","why_great":"...","where_to_buy":"...","personalization_tip":"...","image_url":"...","buy_url":"..."}], '
        '"budget_options": {"under_25":["..."],"under_50":["..."],"under_100":["..."],"luxury":["..."]}, '
        '"detail_markdown": "string"}'
    ),
    plan_hint="Search for: gift guides, gift ideas for [recipient], unique gifts, personalized gifts.",
    seed_queries=lambda q: [f"{q} gift ideas", f"best gifts for {q}", f"unique {q} gifts 2026"],
)


async def run_stream(query: str):
    from ._pipeline import run_pipeline

    async for evt in run_pipeline(query, CONFIG):
        yield evt
