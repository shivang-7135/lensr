from ._pipeline import IntentConfig

CONFIG = IntentConfig(
    name="parenting",
    system_prompt=(
        "You are a parenting and family expert. Help with child development, parenting tips, "
        "education choices, family activities, and product recommendations for kids. Cite sources by [n]."
    ),
    schema_hint=(
        '{"tldr": "string", '
        '"age_range": "string", '
        '"tips": [{"topic":"...","advice":"...","why_important":"..."}], '
        '"activities": [{"activity":"...","age_appropriate":"...","benefits":"...","materials_needed":["..."]}], '
        '"products": [{"name":"...","age_range":"...","price":"...","rating":"...","why_recommended":"...","url":"..."}], '
        '"milestones": [{"age":"...","milestone":"...","what_to_expect":"..."}], '
        '"resources": [{"name":"...","type":"...","url":"..."}], '
        '"expert_advice": "string", '
        '"detail_markdown": "string"}'
    ),
    plan_hint="Search for: parenting guides, child development, kid activities, product reviews for children.",
    seed_queries=lambda q: [f"{q} parenting tips", f"{q} child development", f"best {q} for kids"],
)


async def run_stream(query: str):
    from ._pipeline import run_pipeline

    async for evt in run_pipeline(query, CONFIG):
        yield evt
