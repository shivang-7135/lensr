from ._pipeline import IntentConfig

CONFIG = IntentConfig(
    name="real_estate",
    system_prompt=(
        "You are a real estate expert. Help with home buying/selling, rental searches, mortgage info, "
        "neighborhood research, and property investment. Cite sources by [n]."
    ),
    schema_hint=(
        '{"tldr": "string", '
        '"market_overview": {"median_price":"...","trend":"...","inventory":"...","days_on_market":"..."}, '
        '"neighborhoods": [{"name":"...","avg_price":"...","walkability":"...","schools":"...","crime_rate":"...","pros":["..."],"cons":["..."]}], '
        '"listings": [{"address":"...","price":"...","beds":"...","baths":"...","sqft":"...","url":"...","highlights":["..."]}], '
        '"mortgage_info": {"current_rates":"...","monthly_payment":"...","down_payment":"..."}, '
        '"buying_tips": ["..."], '
        '"selling_tips": ["..."], '
        '"resources": [{"name":"...","url":"...","type":"..."}], '
        '"detail_markdown": "string"}'
    ),
    plan_hint="Search for: real estate listings, housing market data, neighborhood guides, mortgage rates, Zillow, Redfin.",
    seed_queries=lambda q: [f"{q} homes for sale", f"{q} real estate market", f"{q} neighborhood guide"],
)


async def run_stream(query: str):
    from ._pipeline import run_pipeline
    async for evt in run_pipeline(query, CONFIG):
        yield evt
