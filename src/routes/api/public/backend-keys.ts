/**
 * Returns all stored API keys as a flat { NAME: value } map.
 * Authenticated only via the shared secret used by the Python backend.
 * Place under /api/public/* so external callers (the Python service) can reach it.
 */
import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";

function safeCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Compare against self to spend constant time, then return false
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export const Route = createFileRoute("/api/public/backend-keys")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = request.headers.get("x-backend-secret") ?? "";
        const expected = process.env.BACKEND_SHARED_SECRET ?? "";
        if (!expected || !safeCompare(secret, expected)) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.from("api_keys").select("name, value");
        if (error) {
          // Don't leak database error details
          return new Response("Internal error", { status: 500 });
        }
        const map: Record<string, string> = {};
        for (const row of data ?? []) map[row.name] = row.value ?? "";
        return Response.json(map, { headers: { "Cache-Control": "no-store" } });
      },
    },
  },
});
