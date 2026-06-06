/**
 * Streaming search endpoint.
 *
 * Two backends:
 *   1. Python LangGraph backend at BACKEND_BASE_URL (preferred, with real Serper search).
 *   2. Fallback: an in-process adaptive agent powered by the Lovable AI Gateway
 *      with Gemini google_search grounding. Returns intent-specific structured JSON
 *      so the rich result cards render instead of raw markdown.
 */
import { createFileRoute } from "@tanstack/react-router";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization",
};

type Intent = "shopping" | "price_history" | "trip" | "insta" | "movies" | "general";

export const Route = createFileRoute("/api/search")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { headers: corsHeaders }),
      POST: async ({ request }) => {
        const body = (await request.json()) as { query?: string; intent_hint?: string };
        const query = (body.query ?? "").trim();
        if (!query) {
          return new Response(JSON.stringify({ error: "Missing query" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        const rawBackend = process.env.BACKEND_BASE_URL;
        const backendSecret = process.env.BACKEND_SHARED_SECRET;
        const backendUrl = isValidHttpUrl(rawBackend) ? rawBackend! : null;

        if (backendUrl) {
          const upstream = await fetch(`${backendUrl.replace(/\/$/, "")}/search`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(backendSecret ? { "X-Backend-Secret": backendSecret } : {}),
            },
            body: JSON.stringify({ query, intent_hint: body.intent_hint }),
          });
          if (!upstream.ok || !upstream.body) {
            const text = await upstream.text().catch(() => "");
            return new Response(
              JSON.stringify({ error: `Backend ${upstream.status}: ${text || "unavailable"}` }),
              { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } },
            );
          }
          return new Response(upstream.body, {
            headers: sseHeaders(),
          });
        }

        return streamAdaptiveAgent(query);
      },
    },
  },
});

function sseHeaders() {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    ...corsHeaders,
  };
}

/* ---------------- Adaptive in-process agent (fallback) ---------------- */

async function streamAdaptiveAgent(query: string): Promise<Response> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "No backend configured." }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      try {
        // Step 0: LLM-based intent classification (with regex hint)
        send({ type: "stage", stage: "classify_intent" });
        const hint = regexIntentHint(query);
        let intent = await classifyIntentLLM(query, hint, apiKey);
        send({ type: "intent_detected", intent });

        // Step 1: extract keywords
        send({ type: "stage", stage: "extract_keywords" });
        const keywords = await extractKeywords(query, apiKey);
        send({ type: "keywords_extracted", keywords });

        // Step 2: plan searches
        send({ type: "stage", stage: "plan" });
        const plan = planQueries(query, intent, keywords.keywords ?? []);
        send({ type: "search_plan", queries: plan });

        // Step 3: research via Gemini with google_search grounding
        send({ type: "stage", stage: "search_loop_1" });
        const { evidence, sources } = await researchWithGrounding(query, plan, intent, apiKey);
        send({ type: "search_results", loop: 1, count: sources.length, sample: sources.slice(0, 4) });

        // Step 4: reflection (single pass for fallback)
        send({
          type: "reflection",
          loop: 1,
          done: true,
          missing: "",
          followup_queries: [],
        });

        // If no sources came back, degrade to general with raw evidence
        if (sources.length === 0 && evidence.trim().length === 0) {
          send({ type: "stage", stage: "search_loop_1_empty" });
          send({
            type: "final",
            intent: "general",
            structured: { tldr: "I couldn't find reliable sources for this query. Try rephrasing or being more specific.", key_facts: [], detail_markdown: "" },
            markdown: "",
            sources: [],
          });
          return;
        }

        // Step 5: synthesize structured JSON (with repair + validation, degrades to general)
        send({ type: "stage", stage: "synthesize" });
        const { intent: finalIntent, structured } = await synthesizeStructured(
          query, intent, evidence, sources, apiKey, send,
        );

        // Strip hallucinated image URLs / links that aren't in the sources list
        let cleaned = sanitizeStructured(finalIntent, structured, sources);

        // Image enrichment: generate a hero/poster shot when we don't already have one from sources
        if (finalIntent === "insta") {
          send({ type: "stage", stage: "generate_image" });
          const scene = (cleaned.scene as string) || query;
          const mood = (cleaned.mood as string) || "";
          const imgUrl = await generateAIImage(
            `Instagram-ready photograph. ${scene}. Mood: ${mood || "vibrant"}. Cinematic lighting, shallow depth of field, vibrant colors, social-media composition.`,
            apiKey,
          );
          if (imgUrl) cleaned = { ...cleaned, generated_image_url: imgUrl };
        } else if (finalIntent === "trip" && !cleaned.hero_image_url) {
          send({ type: "stage", stage: "generate_image" });
          const dest = (cleaned.destination as string) || query;
          const imgUrl = await generateAIImage(
            `Travel hero photograph of ${dest}. Iconic landmark, golden hour, wide cinematic composition, vibrant colors, no text or watermark.`,
            apiKey,
          );
          if (imgUrl) cleaned = { ...cleaned, hero_image_url: imgUrl };
        } else if (finalIntent === "movies" && Array.isArray(cleaned.picks)) {
          send({ type: "stage", stage: "fetch_posters" });
          const picks = cleaned.picks as Record<string, unknown>[];
          const enriched = await Promise.all(picks.map(async (p) => {
            const title = (p.title as string) ?? "";
            const year = p.year ? String(p.year) : "";
            const where = (p.where_to_watch as string) ?? "";
            const next: Record<string, unknown> = { ...p };
            // Always attach a watch URL (platform-specific search)
            next.watch_url = buildWatchUrl(title, where);
            // Fetch real poster from iTunes if missing
            const hasReal = typeof p.poster_url === "string" && /^https?:\/\//.test(p.poster_url);
            if (!hasReal && title) {
              const poster = await fetchRealPoster(title, year);
              if (poster) next.poster_url = poster;
            }
            return next;
          }));
          cleaned = { ...cleaned, picks: enriched };
        }

        send({
          type: "final",
          intent: finalIntent,
          structured: cleaned,
          markdown: typeof cleaned?.detail_markdown === "string" ? cleaned.detail_markdown as string : "",
          sources,
        });
      } catch (e) {
        send({ type: "error", message: e instanceof Error ? e.message : "Unknown error" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: sseHeaders() });
}

/* ---------------- Pipeline steps ---------------- */

interface Keywords {
  keywords?: string[];
  entities?: string[];
  constraints?: string[];
  intent_summary?: string;
}

async function extractKeywords(query: string, apiKey: string): Promise<Keywords> {
  const res = await callJSON(apiKey, "google/gemini-2.5-flash-lite", [
    {
      role: "system",
      content:
        "Extract structured search intent from the user's query. " +
        'Return ONLY valid JSON: {"keywords":[5-8 short search-friendly terms],"entities":[named things],"constraints":[budget/time/etc],"intent_summary":"one short sentence"}.',
    },
    { role: "user", content: query },
  ]);
  return (res as Keywords) ?? { keywords: [query] };
}

function planQueries(query: string, intent: Intent, keywords: string[]): string[] {
  const kw = keywords.slice(0, 3).join(" ");
  const base = kw || query;
  const plans: Record<Intent, string[]> = {
    shopping: [`${base} review 2025`, `${base} vs alternatives`, `best ${query} 2025`, `${query} pros and cons`],
    price_history: [`${query} price history`, `${query} sale dates`, `when is ${base} cheapest`, `${base} discount calendar`],
    trip: [`things to do ${query}`, `${query} itinerary`, `best time to visit ${base}`, `${base} local food`],
    insta: [`${query} caption ideas`, `${base} instagram hashtags`, `${base} aesthetic spots`],
    movies: [`${query} best 2025`, `${base} review imdb`, `${base} where to watch streaming`, `${base} rotten tomatoes`],
    general: [query, `${query} explained`, `${query} latest`, `what is ${base}`],
  };
  return plans[intent].slice(0, 4);
}

interface Source { title: string; url: string }

async function researchWithGrounding(
  query: string,
  plan: string[],
  intent: Intent,
  apiKey: string,
): Promise<{ evidence: string; sources: Source[] }> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            `You are a research assistant gathering current, accurate evidence for a ${intent} query. ` +
            "Use web search aggressively across the suggested angles. " +
            "Output a 350-600 word evidence brief with concrete facts, names, prices, and dates. " +
            "Use inline [n] citations referencing a numbered list. " +
            "End with a section exactly titled 'Sources:' followed by a numbered list of the URLs you actually used, in [n] order.",
        },
        {
          role: "user",
          content: `Query: ${query}\n\nSuggested search angles:\n- ${plan.join("\n- ")}`,
        },
      ],
      tools: [{ type: "google_search" }],
    }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Grounded search failed (${res.status}): ${t.slice(0, 200)}`);
  }
  const json = await res.json();
  const evidence: string = json.choices?.[0]?.message?.content ?? "";

  // Try every known shape for Gemini grounding metadata
  const msg = json.choices?.[0]?.message ?? {};
  const cand = json.choices?.[0] ?? {};
  const gm =
    msg.grounding_metadata ??
    msg.metadata?.grounding_metadata ??
    cand.grounding_metadata ??
    msg.groundingMetadata ??
    null;

  const sources: Source[] = [];
  const seen = new Set<string>();
  const chunks = gm?.grounding_chunks ?? gm?.groundingChunks ?? [];
  for (const c of chunks) {
    const web = c.web ?? c.Web;
    const url = web?.uri ?? web?.url;
    const title = web?.title ?? web?.domain ?? url;
    if (url && !seen.has(url)) {
      seen.add(url);
      sources.push({ title: title || url, url });
    }
  }
  // Fallback: parse URLs out of evidence text
  if (sources.length === 0) {
    const urlRe = /https?:\/\/[^\s)\]]+/g;
    const matches = evidence.match(urlRe) ?? [];
    for (const url of matches.slice(0, 10)) {
      const clean = url.replace(/[.,);\]]+$/, "");
      if (!seen.has(clean)) {
        seen.add(clean);
        try {
          sources.push({ title: new URL(clean).hostname.replace(/^www\./, ""), url: clean });
        } catch { /* ignore */ }
      }
    }
  }

  return { evidence, sources };
}

async function synthesizeStructured(
  query: string,
  intent: Intent,
  evidence: string,
  sources: Source[],
  apiKey: string,
  send: (obj: unknown) => void,
): Promise<{ intent: Intent; structured: Record<string, unknown> }> {
  const schema = SCHEMA_HINT[intent];
  const sysPrompt = SYS_PROMPT[intent];
  const sourceList = sources.map((s, i) => `[${i + 1}] ${s.title} — ${s.url}`).join("\n");

  // Stream a short partial answer for UX while we wait for the JSON
  fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      stream: true,
      messages: [
        { role: "system", content: "Write a 2-3 sentence TL;DR for the user based on the evidence. Plain prose, no preamble." },
        { role: "user", content: `Query: ${query}\n\nEvidence:\n${evidence.slice(0, 4000)}` },
      ],
    }),
  })
    .then(async (r) => {
      if (!r.ok || !r.body) return;
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const j = line.slice(6).trim();
          if (j === "[DONE]") return;
          try {
            const p = JSON.parse(j);
            const d = p.choices?.[0]?.delta?.content;
            if (d) send({ type: "partial_answer", delta: d });
          } catch { /* ignore */ }
        }
      }
    })
    .catch(() => { /* non-fatal */ });

  const userMsg = `Query: ${query}\n\nNumbered sources (cite these as [n]):\n${sourceList || "(none)"}\n\nEvidence:\n${evidence}`;

  // First attempt
  let structured = (await callJSON(apiKey, "google/gemini-3-flash-preview", [
    {
      role: "system",
      content:
        `${sysPrompt}\n\nReturn ONLY valid JSON matching this schema (no markdown, no commentary):\n${schema}\n\n` +
        "Be concrete and specific. Cite the numbered sources inline in detail_markdown using [n]. " +
        "Every required field must be populated using the evidence. Do not invent sources.",
    },
    { role: "user", content: userMsg },
  ])) as Record<string, unknown> | null;

  // Repair pass if invalid/empty
  if (!structured || !validateIntent(intent, structured)) {
    const repaired = (await callJSON(apiKey, "google/gemini-2.5-flash-lite", [
      {
        role: "system",
        content:
          "Repair the assistant's previous output to valid JSON matching this schema exactly. " +
          "Fill any missing required fields using the evidence. Reply with JSON only, no markdown.\n\n" +
          `Schema:\n${schema}`,
      },
      {
        role: "user",
        content:
          `Previous output:\n${JSON.stringify(structured ?? {})}\n\n` +
          `Original evidence:\n${evidence.slice(0, 6000)}\n\n` +
          `Numbered sources:\n${sourceList || "(none)"}`,
      },
    ])) as Record<string, unknown> | null;
    if (repaired && validateIntent(intent, repaired)) {
      structured = repaired;
    }
  }

  // Still invalid → degrade to general using the evidence
  if (!structured || !validateIntent(intent, structured)) {
    const generalSchema = SCHEMA_HINT.general;
    const general = (await callJSON(apiKey, "google/gemini-2.5-flash-lite", [
      {
        role: "system",
        content:
          `${SYS_PROMPT.general}\n\nReturn ONLY valid JSON matching:\n${generalSchema}\n\n` +
          "key_facts: 4-8 short bullets of the most useful concrete facts (with [n] citations). " +
          "detail_markdown: a clean, well-structured answer with [n] citations to the numbered sources. Use GFM tables/lists where helpful.",
      },
      { role: "user", content: userMsg },
    ])) as Record<string, unknown> | null;

    return {
      intent: "general",
      structured: general && validateIntent("general", general)
        ? general
        : {
            tldr: firstParagraph(evidence) || "Here's what I found.",
            key_facts: [],
            detail_markdown: evidence,
          },
    };
  }

  return { intent, structured };
}

function firstParagraph(s: string): string {
  const p = s.split(/\n\s*\n/)[0]?.trim() ?? "";
  return p.length > 320 ? p.slice(0, 317) + "…" : p;
}

/* ---------------- LLM helpers ---------------- */

async function callJSON(apiKey: string, model: string, messages: Array<{ role: string; content: string }>): Promise<unknown> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, response_format: { type: "json_object" } }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`LLM ${model} failed (${res.status}): ${t.slice(0, 200)}`);
  }
  const json = await res.json();
  const content: string = json.choices?.[0]?.message?.content ?? "{}";
  try { return JSON.parse(content); } catch {
    const m = content.match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch { /* ignore */ } }
    return null;
  }
}

function regexIntentHint(q: string): Intent {
  const s = q.toLowerCase();
  if (/price\s+(history|of)|when.*(cheap|drop|sale)|sale dates?/.test(s)) return "price_history";
  if (/\b(movie|movies|film|films|tv show|tv series|series|netflix|prime video|hbo|hulu|disney\+|to watch|streaming|imdb|rotten tomatoes)\b/.test(s)) return "movies";
  if (/trip|travel|vacation|itinerary|days? in |visit /.test(s)) return "trip";
  if (/caption|hashtag|instagram|insta/.test(s)) return "insta";
  if (/\bvs\b|compare|cheapest|under \$|under €/.test(s)) return "shopping";
  return "general";
}

async function classifyIntentLLM(query: string, hint: Intent, apiKey: string): Promise<Intent> {
  try {
    const res = (await callJSON(apiKey, "google/gemini-2.5-flash-lite", [
      {
        role: "system",
        content:
          "Classify the user's search query into ONE intent. Return ONLY JSON: " +
          '{"intent":"shopping|price_history|trip|insta|movies|general","confidence":0..1,"reason":"short"}.\n\n' +
          "Definitions:\n" +
          "- shopping: comparing/choosing between concrete products to BUY NOW with picks, pros/cons, alternatives. Needs a real comparable set.\n" +
          "- price_history: asking about price trends, sale windows, or whether to buy now vs wait.\n" +
          "- trip: travel planning, itineraries, destinations, what to do somewhere.\n" +
          "- insta: instagram captions, hashtags, aesthetic content suggestions.\n" +
          "- movies: recommendations or 'what to watch' for movies/films/TV shows/series on any streaming platform (Netflix, Prime, HBO, Hulu, Disney+, etc.).\n" +
          "- general: research, how-to, explanations, single-product deep dives, anything that doesn't cleanly fit above.\n\n" +
          "Bias toward 'general' unless the query clearly fits another intent.",
      },
      { role: "user", content: `Query: ${query}\nRegex hint: ${hint}` },
    ])) as { intent?: string; confidence?: number } | null;

    const allowed: Intent[] = ["shopping", "price_history", "trip", "insta", "movies", "general"];
    const picked = allowed.includes(res?.intent as Intent) ? (res!.intent as Intent) : hint;
    const conf = typeof res?.confidence === "number" ? res.confidence : 0;
    return conf < 0.6 ? "general" : picked;
  } catch {
    return hint;
  }
}

function validateIntent(intent: Intent, obj: Record<string, unknown>): boolean {
  if (!obj || typeof obj !== "object") return false;
  const has = (k: string) => k in obj && obj[k] !== null && obj[k] !== undefined && obj[k] !== "";
  const arr = (k: string) => Array.isArray(obj[k]) && (obj[k] as unknown[]).length > 0;
  if (!has("tldr")) return false;
  switch (intent) {
    case "shopping": return arr("picks");
    case "price_history": return has("typical_price_range") || has("buy_now_score");
    case "trip": return arr("days");
    case "insta": return arr("captions");
    case "movies": return arr("picks");
    case "general": return true;
    default: return false;
  }
}

function isValidHttpUrl(value: string | undefined | null): boolean {
  if (!value) return false;
  try { const u = new URL(value); return u.protocol === "http:" || u.protocol === "https:"; } catch { return false; }
}

/* ---------------- Intent schemas and prompts ---------------- */

const SYS_PROMPT: Record<Intent, string> = {
  shopping:
    "You are a meticulous shopping advisor. Compare 2-4 picks honestly with pros/cons and price hints based ONLY on the evidence. Cite sources with [n]. If the evidence doesn't contain a real comparable set of products, return general intent instead.",
  price_history:
    "You are a price-history analyst. Estimate typical price range, trend, best sale windows, and a buy-now score (0-10) based on the evidence.",
  trip:
    "You are a senior trip planner. Build a concrete, walkable itinerary grounded in the evidence. Prefer specific venues over generic advice.",
  insta:
    "You are an Instagram caption writer. Produce 3-5 caption styles, 12-20 hashtags, and place suggestions based on the evidence.",
  movies:
    "You are a film and TV critic. Recommend 4-8 specific titles that match the user's query, grounded ONLY in the evidence. For each title give a tight 'why_recommended' (1 sentence), genre, runtime, rating (IMDb/RT if present), where_to_watch (Netflix/Prime/HBO/etc) and a short synopsis. Never invent titles.",
  general:
    "Answer directly using the evidence. Be specific, accurate, well-structured. Include key facts and a rich markdown detail section with [n] citations.",
};

const SCHEMA_HINT: Record<Intent, string> = {
  shopping:
    '{"tldr":"string","recommendation":"name of top pick","picks":[{"name":"...","price_range":"...","best_for":"...","pros":["..."],"cons":["..."],"url":"...","image_url":"https://... product image URL that appears in the Sources list (omit if none)","buy_links":[{"label":"Amazon|Best Buy|Official site|...","url":"https://... must be one of the Sources URLs"}]}],"comparison_table":[{"name":"...","price":"...","key_spec":"...","rating":"..."}],"detail_markdown":"string"}',
  price_history:
    '{"tldr":"string","typical_price_range":"e.g. $899-$1199","currency":"$|€|£|₹","trend":"rising|falling|stable|unknown","buy_now_score":0-10,"buy_now_reason":"string","current_price":number,"lowest_price":{"price":number,"when":"YYYY-MM","where":"retailer"},"price_points":[{"date":"YYYY-MM","price":number,"label":"optional retailer/event"}],"sale_windows":[{"when":"...","why":"...","expected_drop":"..."}],"detail_markdown":"string"}\n\nIMPORTANT: price_points should be 6-12 monthly samples reconstructed from the evidence so the user sees a real trend line. Use numeric prices in one consistent currency.',
  trip:
    '{"tldr":"string","destination":"string","best_time_to_visit":"string","hero_image_url":"https://... destination image URL from the Sources (omit if none)","days":[{"day":1,"theme":"...","morning":"...","afternoon":"...","evening":"...","food":"...","transport_tip":"...","image_url":"https://... from Sources, optional"}],"budget_hint":"string","packing_tips":["..."],"related_links":[{"label":"Official tourism|Booking|Map|...","url":"https://... must be from Sources"}],"detail_markdown":"string"}',
  insta:
    '{"tldr":"string","scene":"2-3 sentence vivid visual description of the ideal shot","mood":"string","captions":[{"style":"witty|poetic|minimal|bold|funny","text":"..."}],"hashtags":["#..."],"place_suggestions":[{"name":"...","why":"...","url":"https://... from Sources","image_url":"https://... from Sources, optional"}],"detail_markdown":"string"}',
  movies:
    '{"tldr":"1-2 sentence overview of what to watch","recommendation":"title of the top pick","picks":[{"title":"...","year":"YYYY","genre":"Thriller|Drama|...","rating":"e.g. 8.4 IMDb or 92% RT","runtime":"e.g. 2h 14m","where_to_watch":"Netflix|Prime|HBO|Hulu|...","why_recommended":"1 sentence on why it fits the query","synopsis":"2-3 sentence plot summary","poster_url":"https://... ONLY if a real poster URL appears in the Sources list (omit otherwise)","trailer_url":"https://www.youtube.com/... if found in Sources (omit otherwise)"}],"detail_markdown":"string"}\n\nIMPORTANT: 4-8 picks. Use real titles only. Never fabricate poster_url or trailer_url — omit those fields if no source covers them.',
  general:
    '{"tldr":"string","key_facts":["..."],"hero_image_url":"https://... a representative image URL drawn from the Sources (omit if none)","related_links":[{"label":"short label","url":"https://... must be one of the Sources URLs"}],"detail_markdown":"string (rich markdown with sections)"}',
};

/* ---------------- URL hygiene + media enrichment ---------------- */

function sourceUrlSet(sources: Source[]): Set<string> {
  return new Set(sources.map((s) => s.url));
}

function looksLikeImage(u: string): boolean {
  return /\.(png|jpe?g|webp|gif|avif)(\?|#|$)/i.test(u);
}

function sanitizeStructured(intent: Intent, obj: Record<string, unknown>, sources: Source[]): Record<string, unknown> {
  const allowed = sourceUrlSet(sources);
  const okLink = (u: unknown): u is string => typeof u === "string" && /^https?:\/\//.test(u) && allowed.has(u);
  const okImage = (u: unknown): u is string => typeof u === "string" && /^https?:\/\//.test(u) && (allowed.has(u) || looksLikeImage(u));
  const filterLinks = (arr: unknown): { label: string; url: string }[] | undefined => {
    if (!Array.isArray(arr)) return undefined;
    const out = arr
      .map((x) => x as { label?: unknown; url?: unknown })
      .filter((x) => typeof x?.label === "string" && okLink(x?.url))
      .map((x) => ({ label: x.label as string, url: x.url as string }));
    return out.length ? out.slice(0, 6) : undefined;
  };

  const o: Record<string, unknown> = { ...obj };
  if ("hero_image_url" in o && !okImage(o.hero_image_url)) delete o.hero_image_url;
  if ("related_links" in o) {
    const f = filterLinks(o.related_links);
    if (f) o.related_links = f; else delete o.related_links;
  }

  if (intent === "shopping" && Array.isArray(o.picks)) {
    o.picks = (o.picks as Record<string, unknown>[]).map((p) => {
      const np = { ...p };
      if ("image_url" in np && !okImage(np.image_url)) delete np.image_url;
      if ("buy_links" in np) {
        const f = filterLinks(np.buy_links);
        if (f) np.buy_links = f; else delete np.buy_links;
      }
      return np;
    });
  }
  if (intent === "trip" && Array.isArray(o.days)) {
    o.days = (o.days as Record<string, unknown>[]).map((d) => {
      const nd = { ...d };
      if ("image_url" in nd && !okImage(nd.image_url)) delete nd.image_url;
      return nd;
    });
  }
  if (intent === "insta" && Array.isArray(o.place_suggestions)) {
    o.place_suggestions = (o.place_suggestions as Record<string, unknown>[]).map((p) => {
      const np = { ...p };
      if ("image_url" in np && !okImage(np.image_url)) delete np.image_url;
      return np;
    });
  }
  if (intent === "movies" && Array.isArray(o.picks)) {
    o.picks = (o.picks as Record<string, unknown>[]).map((p) => {
      const np = { ...p };
      if ("poster_url" in np && !okImage(np.poster_url)) delete np.poster_url;
      if ("trailer_url" in np && !okLink(np.trailer_url)) delete np.trailer_url;
      return np;
    });
  }
  return o;
}

const STREAMING_SEARCH: Record<string, (q: string) => string> = {
  netflix: (q) => `https://www.netflix.com/search?q=${q}`,
  prime: (q) => `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${q}`,
  "amazon prime": (q) => `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${q}`,
  "prime video": (q) => `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${q}`,
  hbo: (q) => `https://play.max.com/search?q=${q}`,
  max: (q) => `https://play.max.com/search?q=${q}`,
  "hbo max": (q) => `https://play.max.com/search?q=${q}`,
  hulu: (q) => `https://www.hulu.com/search?q=${q}`,
  "disney+": (q) => `https://www.disneyplus.com/search?q=${q}`,
  disney: (q) => `https://www.disneyplus.com/search?q=${q}`,
  "apple tv": (q) => `https://tv.apple.com/search?term=${q}`,
  "apple tv+": (q) => `https://tv.apple.com/search?term=${q}`,
  peacock: (q) => `https://www.peacocktv.com/search?q=${q}`,
  paramount: (q) => `https://www.paramountplus.com/search/?query=${q}`,
  "paramount+": (q) => `https://www.paramountplus.com/search/?query=${q}`,
  youtube: (q) => `https://www.youtube.com/results?search_query=${q}+movie`,
};

function buildWatchUrl(title: string, where: string): string {
  const q = encodeURIComponent(title);
  const w = (where || "").toLowerCase().trim();
  for (const key of Object.keys(STREAMING_SEARCH)) {
    if (w.includes(key)) return STREAMING_SEARCH[key](q);
  }
  return `https://www.justwatch.com/us/search?q=${q}`;
}

async function fetchRealPoster(title: string, year: string): Promise<string | null> {
  // Wikipedia REST API — returns real movie/TV posters from Wikipedia infoboxes.
  const queries = [
    year ? `${title} ${year} film` : `${title} film`,
    year ? `${title} ${year} TV series` : `${title} TV series`,
    title,
  ];
  for (const q of queries) {
    try {
      // 1) Search to resolve the canonical page title
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srlimit=1&origin=*&srsearch=${encodeURIComponent(q)}`;
      const sr = await fetch(searchUrl, { headers: { "User-Agent": "Lensr/1.0 (lovable.dev)" } });
      if (!sr.ok) continue;
      const sj = (await sr.json()) as { query?: { search?: Array<{ title?: string }> } };
      const pageTitle = sj.query?.search?.[0]?.title;
      if (!pageTitle) continue;
      // 2) Fetch the page summary for the lead image
      const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle.replace(/ /g, "_"))}`;
      const pr = await fetch(summaryUrl, { headers: { "User-Agent": "Lensr/1.0 (lovable.dev)" } });
      if (!pr.ok) continue;
      const pj = (await pr.json()) as {
        originalimage?: { source?: string };
        thumbnail?: { source?: string };
      };
      const img = pj.originalimage?.source || pj.thumbnail?.source;
      if (img && /^https?:\/\//.test(img)) return img;
    } catch { /* try next */ }
  }
  return null;
}

async function generateAIImage(prompt: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const msg = json.choices?.[0]?.message ?? {};
    const images = msg.images;
    if (Array.isArray(images) && images.length) {
      const first = images[0];
      const url = first?.image_url?.url ?? first?.url;
      if (typeof url === "string") return url;
    }
    const content = msg.content;
    if (typeof content === "string" && content.startsWith("data:image")) return content;
    if (Array.isArray(content)) {
      for (const c of content) {
        const url = c?.image_url?.url ?? c?.url;
        if (typeof url === "string" && (url.startsWith("http") || url.startsWith("data:image"))) return url;
      }
    }
    return null;
  } catch {
    return null;
  }
}

