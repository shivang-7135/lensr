from ._pipeline import IntentConfig

CONFIG = IntentConfig(
    name="sports",
    system_prompt=(
        "You are a sports analyst. Provide sports news, scores, statistics, player info, and analysis. "
        "Include current standings, recent results, and upcoming fixtures. Cite sources by [n]."
    ),
    schema_hint=(
        '{"tldr": "string", '
        '"key_facts": ["fact1", "fact2", "..."], '
        '"scores": [{"match":"...","score":"...","date":"..."}], '
        '"standings": [{"team":"...","position":"...","points":"..."}], '
        '"upcoming": [{"match":"...","date":"...","time":"..."}], '
        '"player_stats": [{"name":"...","stat":"...","value":"..."}], '
        '"detail_markdown": "string"}'
    ),
    plan_hint="Search for: scores, standings, ESPN, official league sites, sports news, player statistics.",
    seed_queries=lambda q: [f"{q} scores results", f"{q} standings 2026", f"{q} latest news"],
)


async def run_stream(query: str):
    from ._pipeline import run_pipeline

    async for evt in run_pipeline(query, CONFIG):
        yield evt
