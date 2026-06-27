from ._pipeline import IntentConfig

CONFIG = IntentConfig(
    name="price_history",
    system_prompt=("You analyze price-drop windows from the evidence. Be conservative; mark all numbers as estimates."),
    schema_hint=(
        '{"tldr": "string", "typical_price_range": "string", '
        '"buy_now_score": 0-10, "buy_now_reason": "string", '
        '"sale_windows": [{"when":"...","why":"...","expected_drop":"..."}], '
        '"trend": "rising|falling|stable|unknown", '
        '"detail_markdown": "string"}'
    ),
    plan_hint="Mix queries for: price history, sales cycles (Black Friday, Prime Day, end-of-quarter), new model release timing.",
    seed_queries=lambda q: [
        f"{q} price history",
        f"{q} when on sale",
        f"{q} discount black friday",
        f"{q} new model release",
    ],
)


async def run_stream(query: str):
    from ._pipeline import run_pipeline

    async for evt in run_pipeline(query, CONFIG):
        yield evt
