from ._pipeline import IntentConfig

CONFIG = IntentConfig(
    name="pets",
    system_prompt=(
        "You are a pet care expert. Provide advice on pet care, training, health, nutrition, "
        "and breed information. Include practical tips for pet owners. Cite sources by [n]."
    ),
    schema_hint=(
        '{"tldr": "string", '
        '"pet_type": "string", '
        '"breed_info": {"name":"...","size":"...","lifespan":"...","temperament":"...","exercise_needs":"...","grooming":"..."}, '
        '"care_tips": ["..."], '
        '"health_concerns": [{"issue":"...","symptoms":"...","prevention":"..."}], '
        '"nutrition": {"diet_type":"...","feeding_schedule":"...","foods_to_avoid":["..."]}, '
        '"training_tips": ["..."], '
        '"product_recommendations": [{"product":"...","purpose":"...","price_range":"..."}], '
        '"vet_advice": "string", '
        '"detail_markdown": "string"}'
    ),
    plan_hint="Search for: pet care guides, breed information, pet health, training tips, vet resources.",
    seed_queries=lambda q: [f"{q} pet care guide", f"{q} training tips", f"{q} health and nutrition"],
)


async def run_stream(query: str):
    from ._pipeline import run_pipeline

    async for evt in run_pipeline(query, CONFIG):
        yield evt
