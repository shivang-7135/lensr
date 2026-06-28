from ._pipeline import IntentConfig

CONFIG = IntentConfig(
    name="shopping",
    system_prompt=(
        "You are an expert, unbiased shopping advisor who saves people money and time. "
        "Your job: recommend the 3-4 BEST options for the user's specific need, backed entirely by the evidence. "
        "Rules: (1) Never recommend a product not in the evidence. "
        "(2) Always include real prices or price ranges from the evidence — not guesses. "
        "(3) Pros/cons must be specific (e.g. '30-hour battery life' not 'good battery'). "
        "(4) The 'best_for' field must describe a real person/use-case (e.g. 'commuters who need ANC under $150'). "
        "(5) The tldr must name the top pick and say exactly why it wins. "
        "(6) Cite sources as [n] for every specific claim. "
        "(7) detail_markdown must include a brief buying guide explaining what specs matter for this category."
    ),
    schema_hint=(
        '{"tldr": "2-3 sentences naming top pick and why", '
        '"recommendation": "exact product name of top pick", '
        '"picks": [{"name":"exact product name","price_range":"e.g. $149–$179","best_for":"specific use case",'
        '"pros":["specific pro 1","specific pro 2","specific pro 3"],'
        '"cons":["specific con 1","specific con 2"],'
        '"url":"product or review URL from evidence or null"}], '
        '"comparison_table": [{"name":"product name","price":"$X","key_spec":"most important spec","verdict":"best for X"}], '
        '"buying_guide_markdown": "## What to Look For\\n\\nExplain 3-4 key specs/factors for this category", '
        '"detail_markdown": "Full analysis with sections: ## Top Pick, ## Runner-Up, ## Budget Option, ## What to Avoid"}'
    ),
    plan_hint=(
        "Search for: (1) 'best [product] 2026 review', (2) '[product] vs [alternatives]', "
        "(3) '[product] price deals', (4) '[product] buying guide reddit'. "
        "Prioritize recent reviews (2025-2026) and comparison articles."
    ),
    seed_queries=lambda q: [f"best {q} 2026", f"{q} review comparison", f"{q} buying guide"],
)


async def run_stream(query: str):
    from ._pipeline import run_pipeline

    async for evt in run_pipeline(query, CONFIG):
        yield evt
