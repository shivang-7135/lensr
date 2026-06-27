from ._pipeline import IntentConfig

CONFIG = IntentConfig(
    name="learning",
    system_prompt=(
        "You are an educational expert. Explain concepts clearly for learning and understanding. "
        "Break down complex topics, provide examples, analogies, and learning resources. "
        "Adapt explanation to the apparent skill level. Cite sources by [n]."
    ),
    schema_hint=(
        '{"tldr": "string", '
        '"concept_explained": "string", '
        '"key_points": ["..."], '
        '"examples": [{"scenario":"...","explanation":"..."}], '
        '"analogies": ["..."], '
        '"common_misconceptions": ["..."], '
        '"learning_resources": [{"title":"...","type":"video|article|course|book","url":"...","difficulty":"beginner|intermediate|advanced"}], '
        '"detail_markdown": "string"}'
    ),
    plan_hint="Search for: explanations, educational resources, Khan Academy, Wikipedia, academic papers.",
    seed_queries=lambda q: [f"what is {q} explained simply", f"{q} for beginners", f"learn {q} tutorial"],
)


async def run_stream(query: str):
    from ._pipeline import run_pipeline

    async for evt in run_pipeline(query, CONFIG):
        yield evt
