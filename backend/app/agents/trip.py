from ._base import search_then_answer, AgentState

SYS = (
    "You are a trip planner. Build a concise day-by-day itinerary (3-5 days) with: "
    "morning / afternoon / evening highlights, transport tips between activities, "
    "estimated daily budget range, and one local food rec per day. Markdown only."
)


async def run(state) -> AgentState:
    q = state["query"]
    return await search_then_answer(q, SYS, [f"things to do {q}", f"best time to visit {q}", f"{q} itinerary"])
