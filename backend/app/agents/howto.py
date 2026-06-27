from ._pipeline import IntentConfig

CONFIG = IntentConfig(
    name="howto",
    system_prompt=(
        "You are a practical guide expert. Provide clear, step-by-step instructions for how to do things. "
        "Break down complex tasks into simple steps. Include tips, common mistakes, and alternatives. "
        "Cite sources by [n]."
    ),
    schema_hint=(
        '{"tldr": "string", '
        '"difficulty": "easy|medium|hard", '
        '"time_needed": "string", '
        '"materials_needed": ["..."], '
        '"steps": [{"step_number":1,"title":"...","description":"...","tip":"..."}], '
        '"common_mistakes": ["..."], '
        '"pro_tips": ["..."], '
        '"video_url": "string", '
        '"detail_markdown": "string"}'
    ),
    plan_hint="Search for: tutorials, guides, wikihow, YouTube tutorials, step-by-step instructions.",
    seed_queries=lambda q: [f"how to {q} step by step", f"{q} tutorial for beginners", f"{q} guide"],
)


async def run_stream(query: str):
    from ._pipeline import run_pipeline

    async for evt in run_pipeline(query, CONFIG):
        yield evt
