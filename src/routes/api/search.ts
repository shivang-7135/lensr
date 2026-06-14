/**
 * Streaming search endpoint.
 *
 * Proxies all requests to the Python LangGraph backend at BACKEND_BASE_URL.
 * Returns SSE (text/event-stream) with intent-specific structured JSON.
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

        if (!backendUrl) {
          return new Response(
            JSON.stringify({ error: "Search backend is not configured. Set BACKEND_BASE_URL." }),
            { status: 503, headers: { "Content-Type": "application/json", ...corsHeaders } },
          );
        }

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

function isValidHttpUrl(value: string | undefined | null): boolean {
  if (!value) return false;
  try { const u = new URL(value); return u.protocol === "http:" || u.protocol === "https:"; } catch { return false; }
}
