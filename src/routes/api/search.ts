/**
 * Streaming search endpoint.
 *
 * In production this proxies to the Python LangGraph backend at
 * BACKEND_BASE_URL (with a shared-secret header). When that env var is not
 * set, we fall back to a local "mock agent" powered by the Lovable AI
 * Gateway, so the UI works end-to-end during development.
 */
import { createFileRoute } from "@tanstack/react-router";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization",
};

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
          // Proxy SSE from Python backend
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
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
              ...corsHeaders,
            },
          });
        }

        // Fallback: stream a mock agent via Lovable AI Gateway
        return streamMockAgent(query);
      },
    },
  },
});

async function streamMockAgent(query: string): Promise<Response> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "No backend configured." }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const intent = classifyMock(query);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      try {
        send({ type: "intent_detected", intent });
        await sleep(120);
        send({ type: "tool_call", tool: "google_search", input: query });
        await sleep(400);
        send({
          type: "tool_result",
          tool: "google_search",
          summary: "Found 8 relevant sources (mock — Python backend not connected).",
        });

        const sys = systemPromptForIntent(intent);
        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            stream: true,
            messages: [
              { role: "system", content: sys },
              { role: "user", content: query },
            ],
          }),
        });

        if (!upstream.ok || !upstream.body) {
          send({ type: "error", message: `AI gateway error ${upstream.status}` });
          controller.close();
          return;
        }

        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let full = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, nl);
            buffer = buffer.slice(nl + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (json === "[DONE]") break;
            try {
              const parsed = JSON.parse(json);
              const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (delta) { full += delta; send({ type: "partial_answer", delta }); }
            } catch { /* partial */ }
          }
        }

        send({
          type: "final",
          intent,
          markdown: full,
          sources: MOCK_SOURCES,
        });
      } catch (e) {
        send({ type: "error", message: e instanceof Error ? e.message : "Unknown error" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      ...corsHeaders,
    },
  });
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

function classifyMock(q: string): "shopping" | "price_history" | "trip" | "insta" | "general" {
  const s = q.toLowerCase();
  if (/price\s+(history|of)|when.*(cheap|drop|sale)/.test(s)) return "price_history";
  if (/trip|travel|vacation|itinerary|days? in /.test(s)) return "trip";
  if (/caption|hashtag|instagram|insta/.test(s)) return "insta";
  if (/best|buy|vs|review|under \$|cheapest/.test(s)) return "shopping";
  return "general";
}

function systemPromptForIntent(intent: string): string {
  const base =
    "You are Lensr, an intent-aware search assistant. Respond in concise, well-structured markdown. " +
    "Use headings, bullet lists, and a final 'Sources' note. Be honest about uncertainty.";
  switch (intent) {
    case "shopping":
      return base + " The user is shopping. Compare 2-3 top options with a quick pros/cons table and a recommendation.";
    case "price_history":
      return base + " The user wants price-history insight. Note: real chart data requires the Python backend; explain typical sales windows for this product category.";
    case "trip":
      return base + " The user is planning a trip. Give a 3-5 day itinerary with day-by-day highlights, transport tips, and a budget hint.";
    case "insta":
      return base + " The user wants caption help. Offer 3 caption styles (witty, poetic, minimal) and 8 hashtags.";
    default:
      return base + " Synthesize a direct answer with the most useful 3-5 facts and a short tldr.";
  }
}

const MOCK_SOURCES = [
  { title: "Wikipedia — overview", url: "https://en.wikipedia.org" },
  { title: "Top review article (mock)", url: "https://example.com/review" },
  { title: "Pricing tracker (mock)", url: "https://example.com/price" },
];
