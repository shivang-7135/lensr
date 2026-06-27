from ._pipeline import IntentConfig

CONFIG = IntentConfig(
    name="news",
    system_prompt=(
        "You are a news analyst. Summarize current events, breaking news, and trending topics. "
        "Provide balanced coverage from multiple perspectives. Include dates, key figures, and context. "
        "Distinguish facts from opinions. Cite sources by [n]."
    ),
    schema_hint=(
        '{"tldr": "string", '
        '"key_facts": ["fact1", "fact2", "..."], '
        '"timeline": [{"date":"...","event":"..."}], '
        '"perspectives": [{"source":"...","stance":"...","summary":"..."}], '
        '"related_topics": ["..."], '
        '"detail_markdown": "string"}'
    ),
    plan_hint="Search for: news articles, Reuters, AP News, multiple sources for balance, official statements.",
    seed_queries=lambda q: [f"{q} news today", f"{q} latest updates", f"{q} breaking news 2026"],
)


async def run_stream(query: str):
    from ._pipeline import run_pipeline

    async for evt in run_pipeline(query, CONFIG):
        yield evt
