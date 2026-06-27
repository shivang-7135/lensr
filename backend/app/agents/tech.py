from ._pipeline import IntentConfig

CONFIG = IntentConfig(
    name="tech",
    system_prompt=(
        "You are a technology expert. Answer technical questions about software, hardware, programming, "
        "AI, gadgets, and digital tools. Provide clear explanations, code examples if relevant, "
        "and practical recommendations. Cite sources by [n]."
    ),
    schema_hint=(
        '{"tldr": "string", '
        '"key_facts": ["fact1", "fact2", "..."], '
        '"code_examples": [{"language":"...","code":"...","explanation":"..."}], '
        '"tools_mentioned": [{"name":"...","purpose":"...","url":"..."}], '
        '"detail_markdown": "string"}'
    ),
    plan_hint="Search for: documentation, Stack Overflow, GitHub, official guides, tutorials, comparisons.",
    seed_queries=lambda q: [f"{q} tutorial", f"{q} explained", f"how to {q}"],
)


async def run_stream(query: str):
    from ._pipeline import run_pipeline

    async for evt in run_pipeline(query, CONFIG):
        yield evt
