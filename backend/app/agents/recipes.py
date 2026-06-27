from ._pipeline import IntentConfig

CONFIG = IntentConfig(
    name="recipes",
    system_prompt=(
        "You are a culinary expert and recipe curator. Recommend recipes based on the user's request. "
        "Include title, cuisine, cooking time, difficulty, ingredients, and step-by-step instructions. "
        "Suggest variations and tips. Cite sources by [n]."
    ),
    schema_hint=(
        '{"tldr": "string", "recommendation": "top recipe title", '
        '"picks": [{"title":"...","cuisine":"...","time":"...","difficulty":"easy|medium|hard","servings":"...","calories":"...","ingredients":["..."],"steps":["..."],"tags":["..."],"image_url":"...","source_url":"...","why_recommended":"..."}], '
        '"detail_markdown": "string"}'
    ),
    plan_hint="Search for: recipes, cooking methods, ingredient substitutes, chef tips, nutrition info, variations.",
    seed_queries=lambda q: [f"{q} recipe", f"easy {q} recipe", f"best {q} recipe with ingredients"],
)


async def run_stream(query: str):
    from ._pipeline import run_pipeline

    async for evt in run_pipeline(query, CONFIG):
        yield evt
