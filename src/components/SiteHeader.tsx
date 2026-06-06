import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function SiteHeader() {
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const sync = async (userId: string | undefined) => {
      if (!userId) { setIsAdmin(false); return; }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
    };
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null);
      sync(data.session?.user.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user.email ?? null);
      sync(session?.user.id);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-40 glass-soft">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="h-8 w-8 rounded-xl glass flex items-center justify-center font-display text-lg font-bold text-accent">L</span>
          <span className="font-display text-xl tracking-tight">Lensr</span>
          <span className="text-xs text-muted-foreground hidden sm:inline">— search that thinks</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2 text-sm">
          <Link to="/insta" className="px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors">Insta</Link>
          <Link to="/_authenticated/saved" className="px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors">Saved</Link>
          {isAdmin && (
            <Link to="/_authenticated/admin" className="px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors text-accent">Admin</Link>
          )}
          {email ? (
            <button
              onClick={() => supabase.auth.signOut()}
              className="px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors text-muted-foreground"
            >
              Sign out
            </button>
          ) : (
            <Link to="/auth" className="px-4 py-1.5 rounded-full glass-strong text-foreground hover:border-accent/50 transition">Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
