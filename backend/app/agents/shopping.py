from ._pipeline import IntentConfig

CONFIG = IntentConfig(
    name="shopping",
    system_prompt=(
        "You are a meticulous shopping advisor. Recommend the best options for the user using ONLY "
        "the evidence provided. Compare 2-4 picks honestly with pros/cons and price hints. "
        "Cite sources by [n]."
    ),
    schema_hint=(
        '{"tldr": "string", "recommendation": "name of top pick", '
        '"picks": [{"name":"...","price_range":"...","best_for":"...","pros":["..."],"cons":["..."],"url":"..."}], '
        '"comparison_table": [{"name":"...","price":"...","key_spec":"...","rating":"..."}], '
        '"detail_markdown": "string"}'
    ),
    plan_hint="Mix queries for: reviews, comparisons (vs), best-of lists, price, and known alternatives.",
    seed_queries=lambda q: [f"{q} review", f"{q} vs alternatives", f"best {q} 2025", f"{q} price"],
)


async def run_stream(query: str):
    from ._pipeline import run_pipeline

    async for evt in run_pipeline(query, CONFIG):
        yield evt
