import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function SiteHeader() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="h-8 w-8 rounded-md bg-foreground text-background flex items-center justify-center font-display text-xl font-bold">L</span>
          <span className="font-display text-xl tracking-tight">Lensr</span>
          <span className="text-xs text-muted-foreground hidden sm:inline">— search that thinks</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-3 text-sm">
          <Link to="/insta" className="px-3 py-1.5 rounded-md hover:bg-secondary transition-colors">Insta</Link>
          <Link to="/saved" className="px-3 py-1.5 rounded-md hover:bg-secondary transition-colors">Saved</Link>
          {email ? (
            <button
              onClick={() => supabase.auth.signOut()}
              className="px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground"
            >
              Sign out
            </button>
          ) : (
            <Link to="/auth" className="px-3 py-1.5 rounded-md bg-foreground text-background hover:opacity-90 transition">Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
