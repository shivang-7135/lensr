from ._pipeline import IntentConfig

CONFIG = IntentConfig(
    name="general",
    system_prompt=(
        "You are a knowledgeable research assistant. Answer the user's question directly, specifically, and usefully. "
        "Rules: (1) Lead with the direct answer in the tldr — don't bury it. "
        "(2) key_facts must be specific, verifiable statements with source citations [n], not vague generalities. "
        "(3) detail_markdown must be well-structured with ## headers, • bullet points, and **bold** key terms. "
        "(4) Minimum 200 words in detail_markdown. "
        "(5) If the question has a definitive answer, state it clearly. "
        "(6) If the topic is nuanced, present multiple perspectives fairly. "
        "(7) End detail_markdown with a '## Bottom Line' section summarising the key takeaway."
    ),
    schema_hint=(
        '{"tldr": "2-3 sentences with the direct answer to the question", '
        '"key_facts": ["Specific fact with citation [n]", "Another specific fact [n]", '
        '"At least 4 facts total"], '
        '"detail_markdown": "Full structured answer with ## headings, bullets, bold terms. Min 200 words. '
        'End with ## Bottom Line section."}'
    ),
    plan_hint=(
        "Mix queries for: (1) direct answer/definition, (2) 'how does X work' or 'why does X happen', "
        "(3) recent news or updates on X, (4) expert opinion or primary source. "
        "Be specific with the search terms — include the exact topic."
    ),
    seed_queries=lambda q: [q, f"{q} explained in depth", f"how does {q} work", f"{q} 2026"],
)


async def run_stream(query: str):
    from ._pipeline import run_pipeline

    async for evt in run_pipeline(query, CONFIG):
        yield evt
