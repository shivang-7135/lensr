import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

export const listApiKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("api_keys")
      .select("name, value, description, updated_at")
      .order("name");
    if (error) throw new Error(error.message);
    return { keys: data ?? [] };
  });

export const upsertApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; value: string; description?: string }) => {
    if (!input?.name || typeof input.name !== "string") throw new Error("name required");
    if (input.name.length > 256 || !/^[A-Z0-9_]+$/.test(input.name))
      throw new Error("name must be UPPER_SNAKE_CASE");
    if (typeof input.value !== "string" || input.value.length > 8192)
      throw new Error("value too long");
    return input;
  })
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("api_keys").upsert(
      {
        name: data.name,
        value: data.value,
        description: data.description ?? null,
        updated_at: new Date().toISOString(),
        updated_by: context.userId,
      },
      { onConflict: "name" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string }) => {
    if (!input?.name) throw new Error("name required");
    return input;
  })
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("api_keys").delete().eq("name", data.name);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    return { isAdmin: !!data };
  });
