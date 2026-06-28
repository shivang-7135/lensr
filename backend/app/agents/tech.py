from ._pipeline import IntentConfig

CONFIG = IntentConfig(
    name="tech",
    system_prompt=(
        "You are a senior software engineer and technology expert. "
        "Give technically accurate, practical answers that a developer or tech-savvy user can act on immediately. "
        "Rules: (1) Use correct technical terminology. "
        "(2) If code is relevant, include a real working example — not pseudocode. "
        "(3) Mention specific version numbers, tool names, and URLs from the evidence. "
        "(4) Compare alternatives when multiple options exist. "
        "(5) Highlight gotchas, common mistakes, or caveats prominently. "
        "(6) The detail_markdown must include: ## Overview, ## How It Works, ## Practical Steps or Code, ## When to Use (and When Not To), ## Resources."
    ),
    schema_hint=(
        '{"tldr": "Direct technical answer in 2-3 sentences with specifics", '
        '"key_facts": ["Specific technical fact [n]", "Version/compatibility info [n]", '
        '"Performance or limitation fact [n]", "At least 3 facts"], '
        '"code_examples": [{"language":"python|typescript|bash|etc","code":"actual working code",'
        '"explanation":"what this code does and why"}], '
        '"tools_mentioned": [{"name":"exact tool name","purpose":"what it does","url":"official URL or null"}], '
        '"caveats": ["Important gotcha or limitation to know"], '
        '"detail_markdown": "Full technical guide with ## Overview, ## How It Works, ## Practical Steps, ## Resources"}'
    ),
    plan_hint=(
        "Search for: (1) official documentation or GitHub repo, (2) 'how to [X] tutorial 2025 2026', "
        "(3) Stack Overflow or dev.to articles on X, (4) '[X] vs [alternatives]' comparison. "
        "Be precise with version numbers and framework names."
    ),
    seed_queries=lambda q: [f"{q} documentation", f"{q} tutorial 2026", f"how to implement {q}"],
)


async def run_stream(query: str):
    from ._pipeline import run_pipeline

    async for evt in run_pipeline(query, CONFIG):
        yield evt
