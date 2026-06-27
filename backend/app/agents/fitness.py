from ._pipeline import IntentConfig

CONFIG = IntentConfig(
    name="fitness",
    system_prompt=(
        "You are a fitness and workout expert. Provide exercise recommendations, workout plans, "
        "form tips, and fitness advice. Include modifications for different fitness levels. "
        "Cite sources by [n]."
    ),
    schema_hint=(
        '{"tldr": "string", '
        '"workout_plan": {"name":"...","duration":"...","frequency":"...","level":"...","goal":"..."}, '
        '"exercises": [{"name":"...","sets":"...","reps":"...","rest":"...","muscle_groups":["..."],"form_tips":"...","modifications":"...","video_url":"..."}], '
        '"warm_up": ["..."], '
        '"cool_down": ["..."], '
        '"nutrition_tips": ["..."], '
        '"progress_tracking": "string", '
        '"common_mistakes": ["..."], '
        '"detail_markdown": "string"}'
    ),
    plan_hint="Search for: workout guides, exercise tutorials, fitness programs, form guides.",
    seed_queries=lambda q: [f"{q} workout plan", f"best exercises for {q}", f"{q} fitness routine"],
)


async def run_stream(query: str):
    from ._pipeline import run_pipeline

    async for evt in run_pipeline(query, CONFIG):
        yield evt
