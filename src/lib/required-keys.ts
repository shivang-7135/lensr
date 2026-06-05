// Registry of API keys the LangGraph backend expects.
// Keep this list in sync with backend/app/config.py.

export type RequiredKey = {
  name: string;
  required: boolean;
  group: "Search" | "AWS Bedrock" | "Bedrock Models" | "Backend";
  description: string;
  usedBy: string[]; // which agents/services use it
};

export const REQUIRED_KEYS: RequiredKey[] = [
  {
    name: "SERPER_API_KEY",
    required: true,
    group: "Search",
    description: "Serper.dev Google Search API key. Powers all web search tool calls.",
    usedBy: ["shopping", "price_history", "trip", "general"],
  },
  {
    name: "TAVILY_API_KEY",
    required: false,
    group: "Search",
    description: "Optional Tavily fallback search provider used when Serper fails.",
    usedBy: ["fallback search"],
  },
  {
    name: "AWS_ACCESS_KEY_ID",
    required: true,
    group: "AWS Bedrock",
    description: "AWS access key with bedrock:InvokeModel permissions.",
    usedBy: ["all agents"],
  },
  {
    name: "AWS_SECRET_ACCESS_KEY",
    required: true,
    group: "AWS Bedrock",
    description: "AWS secret key paired with the access key above.",
    usedBy: ["all agents"],
  },
  {
    name: "AWS_REGION",
    required: true,
    group: "AWS Bedrock",
    description: "AWS region hosting your Bedrock models (e.g. us-east-1).",
    usedBy: ["all agents"],
  },
  {
    name: "BEDROCK_MODEL_ROUTER",
    required: true,
    group: "Bedrock Models",
    description: "Fast Bedrock model id used for intent classification (e.g. anthropic.claude-3-haiku-20240307-v1:0).",
    usedBy: ["router_graph"],
  },
  {
    name: "BEDROCK_MODEL_REASONING",
    required: true,
    group: "Bedrock Models",
    description: "Reasoning model id used by shopping / price / trip agents (e.g. anthropic.claude-3-5-sonnet-20241022-v2:0).",
    usedBy: ["shopping", "price_history", "trip", "general"],
  },
  {
    name: "BEDROCK_MODEL_VISION",
    required: true,
    group: "Bedrock Models",
    description: "Vision-capable Bedrock model id for Instagram caption + place agent.",
    usedBy: ["insta"],
  },
  {
    name: "BACKEND_BASE_URL",
    required: false,
    group: "Backend",
    description: "Override for the FastAPI LangGraph service URL. Stored as a Lovable secret, not here — shown for reference.",
    usedBy: ["api/search proxy"],
  },
];

export const REQUIRED_KEY_NAMES = REQUIRED_KEYS.map((k) => k.name);
