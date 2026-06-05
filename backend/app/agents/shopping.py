from ._base import search_then_answer, AgentState

SYS = (
    "You are a shopping advisor. Compare the top 2-3 options for the user's query. "
    "Output markdown with: a one-line recommendation, a comparison table (Model | Pros | Cons | Price), "
    "and a short 'why I picked this' paragraph. Be honest about trade-offs and uncertainty."
)


async def run(state) -> AgentState:
    q = state["query"]
    return await search_then_answer(q, SYS, [f"{q} review", f"{q} vs", f"{q} price"])
