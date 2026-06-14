from ._pipeline import IntentConfig

CONFIG = IntentConfig(
    name="finance",
    system_prompt=(
        "You are a financial information specialist. Provide information about investing, personal finance, "
        "budgeting, stocks, crypto, and money management. Include data, trends, and practical tips. "
        "ALWAYS add a disclaimer that this is not financial advice. Cite sources by [n]."
    ),
    schema_hint=(
        '{"tldr": "string", '
        '"disclaimer": "This is for informational purposes only. Consult a financial advisor before making investment decisions.", '
        '"key_facts": ["fact1", "fact2", "..."], '
        '"current_data": {"price":"...","change":"...","market_cap":"...","source":"..."}, '
        '"analysis": "string", '
        '"risks": ["..."], '
        '"opportunities": ["..."], '
        '"detail_markdown": "string"}'
    ),
    plan_hint="Search for: financial news, stock data, market analysis, expert opinions, SEC filings.",
    seed_queries=lambda q: [f"{q} analysis", f"{q} stock price today", f"{q} investment outlook 2026"],
)


async def run_stream(query: str):
    from ._pipeline import run_pipeline
    async for evt in run_pipeline(query, CONFIG):
        yield evt
