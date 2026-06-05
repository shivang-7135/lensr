export type SearchIntent =
  | "shopping"
  | "price_history"
  | "trip"
  | "insta"
  | "general";

export type StreamEvent =
  | { type: "intent_detected"; intent: SearchIntent; entities?: Record<string, unknown> }
  | { type: "tool_call"; tool: string; input: string }
  | { type: "tool_result"; tool: string; summary: string }
  | { type: "partial_answer"; delta: string }
  | { type: "source"; title: string; url: string }
  | { type: "final"; markdown: string; sources: Array<{ title: string; url: string }>; intent: SearchIntent }
  | { type: "error"; message: string };
