import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
const ThemeCtx = createContext<{ theme: Theme; setTheme: (t: Theme) => void; toggle: () => void }>({
  theme: "dark",
  setTheme: () => {},
  toggle: () => {},
});

function readInitial(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readInitial);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
    try { localStorage.setItem("lensr-theme", theme); } catch { /* ignore */ }
  }, [theme]);

  const setTheme = (t: Theme) => setThemeState(t);
  const toggle = () => setThemeState((t) => (t === "dark" ? "light" : "dark"));

  return <ThemeCtx.Provider value={{ theme, setTheme, toggle }}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);

/** Inline script to apply theme before hydration (prevents flash). */
export const themeBootstrapScript = `(function(){try{var s=localStorage.getItem('lensr-theme');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;var d=s?s==='dark':m;var r=document.documentElement;if(d)r.classList.add('dark');else r.classList.remove('dark');r.style.colorScheme=d?'dark':'light';}catch(e){document.documentElement.classList.add('dark');}})();`;
