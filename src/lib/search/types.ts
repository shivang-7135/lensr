export type SearchIntent =
  | "shopping"
  | "price_history"
  | "trip"
  | "insta"
  | "movies"
  | "general";

export interface Source { title: string; url: string; image_url?: string }

export interface RelatedLink { label: string; url: string }

// --- Structured payloads per intent (mirror backend schema_hint) ---

export interface ShoppingPick {
  name: string;
  price_range?: string;
  best_for?: string;
  pros?: string[];
  cons?: string[];
  url?: string;
  image_url?: string;
  buy_links?: RelatedLink[];
}
export interface ShoppingStructured {
  tldr: string;
  recommendation?: string;
  picks?: ShoppingPick[];
  comparison_table?: Array<{ name: string; price?: string; key_spec?: string; rating?: string }>;
  detail_markdown?: string;
}

export interface PricePoint { date: string; price: number; label?: string }
export interface PriceHistoryStructured {
  tldr: string;
  typical_price_range?: string;
  buy_now_score?: number;
  buy_now_reason?: string;
  sale_windows?: Array<{ when: string; why: string; expected_drop?: string }>;
  trend?: "rising" | "falling" | "stable" | "unknown";
  currency?: string;
  lowest_price?: { price: number; when?: string; where?: string };
  current_price?: number;
  price_points?: PricePoint[];
  detail_markdown?: string;
}

export interface TripDay {
  day: number;
  theme?: string;
  morning?: string;
  afternoon?: string;
  evening?: string;
  food?: string;
  transport_tip?: string;
  image_url?: string;
}
export interface TripStructured {
  tldr: string;
  destination?: string;
  best_time_to_visit?: string;
  days?: TripDay[];
  budget_hint?: string;
  packing_tips?: string[];
  hero_image_url?: string;
  related_links?: RelatedLink[];
  detail_markdown?: string;
}

export interface InstaCaption { style: string; text: string; hashtag_count?: number }
export interface InstaStructured {
  tldr: string;
  scene?: string;
  mood?: string;
  captions?: InstaCaption[];
  hashtags?: string[];
  place_suggestions?: Array<{ name: string; why?: string; url?: string; image_url?: string }>;
  generated_image_url?: string;
  detail_markdown?: string;
}

export interface GeneralStructured {
  tldr: string;
  key_facts?: string[];
  hero_image_url?: string;
  related_links?: RelatedLink[];
  detail_markdown?: string;
}

export interface MoviePick {
  title: string;
  year?: string | number;
  genre?: string;
  rating?: string;
  where_to_watch?: string;
  runtime?: string;
  why_recommended?: string;
  synopsis?: string;
  poster_url?: string;
  trailer_url?: string;
}
export interface MoviesStructured {
  tldr: string;
  recommendation?: string;
  picks?: MoviePick[];
  detail_markdown?: string;
}

export type StructuredResult =
  | ({ intent: "shopping" } & ShoppingStructured)
  | ({ intent: "price_history" } & PriceHistoryStructured)
  | ({ intent: "trip" } & TripStructured)
  | ({ intent: "insta" } & InstaStructured)
  | ({ intent: "movies" } & MoviesStructured)
  | ({ intent: "general" } & GeneralStructured);

// --- Streamed events from /api/search ---

export type StreamEvent =
  | { type: "intent_detected"; intent: SearchIntent }
  | { type: "stage"; stage: string }
  | { type: "keywords_extracted"; keywords: { keywords?: string[]; entities?: string[]; constraints?: string[]; intent_summary?: string } }
  | { type: "search_plan"; queries: string[] }
  | { type: "tool_call"; tool: string; input: string }
  | { type: "search_results"; loop: number; count: number; sample: Source[] }
  | { type: "scrape_progress"; count: number }
  | { type: "reflection"; loop: number; done: boolean; missing: string; followup_queries: string[] }
  | { type: "vision_result"; scene: { scene?: string; mood?: string; objects?: string[]; place_type?: string } }
  | { type: "partial_answer"; delta: string }
  | { type: "final"; intent: SearchIntent; structured?: Record<string, unknown>; markdown: string; sources: Source[] }
  | { type: "error"; message: string };
