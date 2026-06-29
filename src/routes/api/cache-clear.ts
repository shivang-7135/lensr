/**
 * Cache clear endpoint — proxied to backend.
 * Admin-only: requires backend shared secret.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/cache-clear")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBackend = process.env.BACKEND_BASE_URL;
        const backendSecret = process.env.BACKEND_SHARED_SECRET;

        if (!rawBackend) {
          return new Response(JSON.stringify({ error: "Backend not configured" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          const upstream = await fetch(`${rawBackend.replace(/\/$/, "")}/cache/clear`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(backendSecret ? { "X-Backend-Secret": backendSecret } : {}),
            },
          });

          const data = await upstream.json();
          return new Response(JSON.stringify(data), {
            status: upstream.status,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          return new Response(JSON.stringify({ error: "Failed to reach backend" }), {
            status: 502,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
