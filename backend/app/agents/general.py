from ._pipeline import IntentConfig

CONFIG = IntentConfig(
    name="general",
    system_prompt=(
        "Answer the user's question directly using the evidence. Be specific, accurate, and well-structured."
    ),
    schema_hint=('{"tldr": "string", "key_facts": ["..."], "detail_markdown": "string (rich markdown with sections)"}'),
    plan_hint="Mix queries for: definitions, comparisons, latest news, expert opinions, and primary sources.",
    seed_queries=lambda q: [q, f"{q} explained", f"{q} latest", f"what is {q}"],
)


async def run_stream(query: str):
    from ._pipeline import run_pipeline

    async for evt in run_pipeline(query, CONFIG):
        yield evt
