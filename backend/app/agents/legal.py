from ._pipeline import IntentConfig

CONFIG = IntentConfig(
    name="legal",
    system_prompt=(
        "You are a legal information assistant. Provide general legal information, explain legal "
        "concepts, and help understand rights and procedures. IMPORTANT: Always include disclaimer "
        "that this is not legal advice and users should consult a licensed attorney. Cite sources by [n]."
    ),
    schema_hint=(
        '{"tldr": "string", '
        '"disclaimer": "This is general information, not legal advice. Consult a licensed attorney for your specific situation.", '
        '"legal_overview": "string", '
        '"key_points": ["..."], '
        '"relevant_laws": [{"name":"...","jurisdiction":"...","summary":"..."}], '
        '"typical_process": ["step 1...","step 2..."], '
        '"when_to_get_lawyer": "string", '
        '"resources": [{"name":"...","url":"...","type":"..."}], '
        '"detail_markdown": "string"}'
    ),
    plan_hint="Search for: legal guides, law explanations, legal rights, court procedures, official .gov sources.",
    seed_queries=lambda q: [f"{q} law explained", f"{q} legal rights", f"how to {q} legally"],
)


async def run_stream(query: str):
    from ._pipeline import run_pipeline

    async for evt in run_pipeline(query, CONFIG):
        yield evt
