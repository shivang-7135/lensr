from ._pipeline import IntentConfig

CONFIG = IntentConfig(
    name="automotive",
    system_prompt=(
        "You are an automotive expert. Help with car buying, reviews, maintenance, repairs, and "
        "comparisons. Cover new and used cars, EVs, and motorcycles. Cite sources by [n]."
    ),
    schema_hint=(
        '{"tldr": "string", '
        '"recommendation": "top pick", '
        '"vehicles": [{"make":"...","model":"...","year":"...","price_range":"...","mpg":"...","rating":"...","pros":["..."],"cons":["..."],"best_for":"..."}], '
        '"comparison": [{"attribute":"...","car1":"...","car2":"..."}], '
        '"maintenance_tips": ["..."], '
        '"common_issues": [{"issue":"...","symptoms":"...","fix":"...","cost":"..."}], '
        '"buying_tips": ["..."], '
        '"resources": [{"name":"...","url":"...","type":"..."}], '
        '"detail_markdown": "string"}'
    ),
    plan_hint="Search for: car reviews, auto comparisons, maintenance guides, Car and Driver, Edmunds, KBB.",
    seed_queries=lambda q: [f"{q} review 2026", f"best {q} cars", f"{q} reliability and problems"],
)


async def run_stream(query: str):
    from ._pipeline import run_pipeline
    async for evt in run_pipeline(query, CONFIG):
        yield evt
