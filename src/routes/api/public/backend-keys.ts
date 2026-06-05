/**
 * Returns all stored API keys as a flat { NAME: value } map.
 * Authenticated only via the shared secret used by the Python backend.
 * Place under /api/public/* so external callers (the Python service) can reach it.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/backend-keys")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = request.headers.get("x-backend-secret");
        const expected = process.env.BACKEND_SHARED_SECRET;
        if (!expected || secret !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.from("api_keys").select("name, value");
        if (error) return new Response(error.message, { status: 500 });
        const map: Record<string, string> = {};
        for (const row of data ?? []) map[row.name] = row.value ?? "";
        return Response.json(map, { headers: { "Cache-Control": "no-store" } });
      },
    },
  },
});
