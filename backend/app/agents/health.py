from ._pipeline import IntentConfig

CONFIG = IntentConfig(
    name="health",
    system_prompt=(
        "You are a health information specialist. Provide evidence-based health and wellness information. "
        "Include symptoms, causes, treatments, and when to see a doctor. "
        "ALWAYS add a disclaimer that this is not medical advice. Cite reputable sources by [n]."
    ),
    schema_hint=(
        '{"tldr": "string", '
        '"disclaimer": "This information is for educational purposes only. Consult a healthcare professional for medical advice.", '
        '"key_facts": ["fact1", "fact2", "..."], '
        '"symptoms": ["..."], '
        '"causes": ["..."], '
        '"treatments": ["..."], '
        '"when_to_see_doctor": "string", '
        '"detail_markdown": "string"}'
    ),
    plan_hint="Search for: medical journals, Mayo Clinic, WebMD, NIH, CDC, peer-reviewed studies.",
    seed_queries=lambda q: [f"{q} symptoms causes treatment", f"{q} health information", f"{q} medical advice"],
)


async def run_stream(query: str):
    from ._pipeline import run_pipeline
    async for evt in run_pipeline(query, CONFIG):
        yield evt
