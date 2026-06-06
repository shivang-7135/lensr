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

type Intent = "shopping" | "price_history" | "trip" | "insta" | "general";

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
        const intent = classifyIntent(query);
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

        // Step 5: synthesize structured JSON
        send({ type: "stage", stage: "synthesize" });
        const structured = await synthesizeStructured(query, intent, evidence, sources, apiKey, send);

        send({
          type: "final",
          intent,
          structured,
          markdown: typeof structured?.detail_markdown === "string" ? structured.detail_markdown : "",
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
  // Use Gemini 2.5 Flash with google_search grounding tool.
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            `You are a research assistant. Use web search to gather current, accurate evidence for a ${intent} query. ` +
            "Run multiple searches if useful. Then output ONLY a concise evidence brief (300-700 words) summarizing what you found, " +
            "including specific facts, names, prices, dates, and URLs in [n] form. Do not write the final user-facing answer yet.",
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

  // Gemini grounding metadata: extract citations / sources if present
  const gm = json.choices?.[0]?.message?.grounding_metadata ?? json.choices?.[0]?.grounding_metadata;
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
  // Fallback: parse URLs out of evidence text if no grounding metadata
  if (sources.length === 0) {
    const urlRe = /https?:\/\/[^\s)\]]+/g;
    const matches = evidence.match(urlRe) ?? [];
    for (const url of matches.slice(0, 8)) {
      if (!seen.has(url)) {
        seen.add(url);
        try {
          sources.push({ title: new URL(url).hostname.replace(/^www\./, ""), url });
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
): Promise<Record<string, unknown>> {
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
        { role: "system", content: "Write a 2-3 sentence TL;DR for the user based on the evidence." },
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

  const structured = await callJSON(apiKey, "google/gemini-2.5-flash", [
    {
      role: "system",
      content:
        `${sysPrompt}\n\nReturn ONLY valid JSON matching this schema (no markdown, no commentary):\n${schema}\n\n` +
        "Be concrete and specific. Cite sources inline in detail_markdown using [n] referencing the numbered sources. " +
        "If evidence is insufficient, still produce best-effort fields and note uncertainty in the tldr.",
    },
    {
      role: "user",
      content: `Query: ${query}\n\nNumbered sources:\n${sourceList || "(none)"}\n\nEvidence:\n${evidence}`,
    },
  ]);
  return (structured as Record<string, unknown>) ?? { tldr: "No structured answer available.", detail_markdown: evidence };
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
    // Try to recover JSON from a fenced block
    const m = content.match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch { /* ignore */ } }
    return null;
  }
}

function classifyIntent(q: string): Intent {
  const s = q.toLowerCase();
  if (/price\s+(history|of)|when.*(cheap|drop|sale)|sale dates?/.test(s)) return "price_history";
  if (/trip|travel|vacation|itinerary|days? in |visit /.test(s)) return "trip";
  if (/caption|hashtag|instagram|insta/.test(s)) return "insta";
  if (/best|buy|vs\b|review|under \$|cheapest|recommend/.test(s)) return "shopping";
  return "general";
}

function isValidHttpUrl(value: string | undefined | null): boolean {
  if (!value) return false;
  try { const u = new URL(value); return u.protocol === "http:" || u.protocol === "https:"; } catch { return false; }
}

/* ---------------- Intent schemas and prompts ---------------- */

const SYS_PROMPT: Record<Intent, string> = {
  shopping:
    "You are a meticulous shopping advisor. Compare 2-4 picks honestly with pros/cons and price hints based ONLY on the evidence. Cite sources with [n].",
  price_history:
    "You are a price-history analyst. Estimate typical price range, trend, best sale windows, and a buy-now score (0-10) based on the evidence.",
  trip:
    "You are a senior trip planner. Build a concrete, walkable itinerary grounded in the evidence. Prefer specific venues over generic advice.",
  insta:
    "You are an Instagram caption writer. Produce 3-5 caption styles, 12-20 hashtags, and place suggestions based on the evidence.",
  general:
    "Answer directly using the evidence. Be specific, accurate, well-structured. Include key facts and a rich markdown detail section.",
};

const SCHEMA_HINT: Record<Intent, string> = {
  shopping:
    '{"tldr":"string","recommendation":"name of top pick","picks":[{"name":"...","price_range":"...","best_for":"...","pros":["..."],"cons":["..."],"url":"..."}],"comparison_table":[{"name":"...","price":"...","key_spec":"...","rating":"..."}],"detail_markdown":"string"}',
  price_history:
    '{"tldr":"string","typical_price_range":"string","trend":"rising|falling|stable|unknown","buy_now_score":0-10,"buy_now_reason":"string","sale_windows":[{"when":"...","why":"...","expected_drop":"..."}],"detail_markdown":"string"}',
  trip:
    '{"tldr":"string","destination":"string","best_time_to_visit":"string","days":[{"day":1,"theme":"...","morning":"...","afternoon":"...","evening":"...","food":"...","transport_tip":"..."}],"budget_hint":"string","packing_tips":["..."],"detail_markdown":"string"}',
  insta:
    '{"tldr":"string","scene":"string","mood":"string","captions":[{"style":"witty|poetic|minimal|bold|funny","text":"..."}],"hashtags":["#..."],"place_suggestions":[{"name":"...","why":"...","url":"..."}],"detail_markdown":"string"}',
  general:
    '{"tldr":"string","key_facts":["..."],"detail_markdown":"string (rich markdown with sections)"}',
};
