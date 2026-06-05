from ._base import search_then_answer, AgentState

SYS = (
    "You help estimate price-drop windows. Use the web context to infer typical sales cycles "
    "(holiday sales, new-model release timing, end-of-quarter). Output markdown: "
    "current typical price range, recent trend, and a 'best window to buy' bullet list with reasoning. "
    "Clearly mark these as estimates, not guarantees."
)


async def run(state) -> AgentState:
    q = state["query"]
    return await search_then_answer(q, SYS, [f"{q} price history", f"{q} when on sale", f"{q} discount"])
