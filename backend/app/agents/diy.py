from ._pipeline import IntentConfig

CONFIG = IntentConfig(
    name="diy",
    system_prompt=(
        "You are a DIY and home improvement expert. Provide step-by-step instructions for repairs, "
        "crafts, and projects. Include tools needed, materials, difficulty level, and safety tips. "
        "Cite sources by [n]."
    ),
    schema_hint=(
        '{"tldr": "string", '
        '"difficulty": "beginner|intermediate|advanced", '
        '"estimated_time": "string", '
        '"estimated_cost": "string", '
        '"tools_needed": ["..."], '
        '"materials_needed": [{"item":"...","quantity":"...","approx_cost":"..."}], '
        '"steps": [{"step_number":1,"title":"...","description":"...","tips":"...","image_url":"..."}], '
        '"safety_warnings": ["..."], '
        '"common_mistakes": ["..."], '
        '"video_tutorials": [{"title":"...","url":"...","platform":"..."}], '
        '"detail_markdown": "string"}'
    ),
    plan_hint="Search for: DIY guides, how to tutorials, home improvement tips, craft instructions.",
    seed_queries=lambda q: [f"how to {q} DIY", f"{q} step by step guide", f"{q} tutorial for beginners"],
)


async def run_stream(query: str):
    from ._pipeline import run_pipeline
    async for evt in run_pipeline(query, CONFIG):
        yield evt
