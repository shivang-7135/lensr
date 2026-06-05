from ._base import search_then_answer, AgentState

SYS = (
    "Answer the user's question directly using the web context. Markdown: "
    "1-line TL;DR, then 3-5 key facts as bullets, then a short paragraph. Cite sources by title."
)


async def run(state) -> AgentState:
    q = state["query"]
    return await search_then_answer(q, SYS, [q])
