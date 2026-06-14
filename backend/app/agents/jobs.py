from ._pipeline import IntentConfig

CONFIG = IntentConfig(
    name="jobs",
    system_prompt=(
        "You are a career advisor. Help with job searching, career advice, salary information, "
        "interview prep, and professional development. Include market data and actionable tips. "
        "Cite sources by [n]."
    ),
    schema_hint=(
        '{"tldr": "string", '
        '"salary_range": {"low":"...","median":"...","high":"...","source":"..."}, '
        '"job_market_outlook": "string", '
        '"key_skills": ["..."], '
        '"top_companies": [{"name":"...","why":"..."}], '
        '"interview_tips": ["..."], '
        '"career_path": ["..."], '
        '"resources": [{"title":"...","url":"..."}], '
        '"detail_markdown": "string"}'
    ),
    plan_hint="Search for: job listings, salary data (Glassdoor, LinkedIn), career guides, interview questions.",
    seed_queries=lambda q: [f"{q} salary 2026", f"{q} job requirements", f"{q} career path"],
)


async def run_stream(query: str):
    from ._pipeline import run_pipeline
    async for evt in run_pipeline(query, CONFIG):
        yield evt
