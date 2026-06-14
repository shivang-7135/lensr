from ._pipeline import IntentConfig

CONFIG = IntentConfig(
    name="comparison",
    system_prompt=(
        "You are a comparison expert. Compare two or more items, services, or concepts objectively. "
        "Create clear comparison tables, highlight key differences, and give a verdict. Cite sources by [n]."
    ),
    schema_hint=(
        '{"tldr": "string", '
        '"verdict": "string", '
        '"items_compared": ["..."], '
        '"comparison_table": [{"attribute":"...","item1_value":"...","item2_value":"...","winner":"..."}], '
        '"pros_cons": [{"item":"...","pros":["..."],"cons":["..."]}], '
        '"use_case_recommendations": [{"use_case":"...","best_choice":"...","why":"..."}], '
        '"detail_markdown": "string"}'
    ),
    plan_hint="Search for: vs comparisons, head-to-head reviews, specification comparisons, user opinions.",
    seed_queries=lambda q: [f"{q} comparison", f"{q} which is better", f"{q} differences"],
)


async def run_stream(query: str):
    from ._pipeline import run_pipeline
    async for evt in run_pipeline(query, CONFIG):
        yield evt
