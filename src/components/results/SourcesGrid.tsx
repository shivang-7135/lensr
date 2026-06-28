import { useState } from "react";
import { ExternalLink, ChevronDown } from "lucide-react";
import type { Source } from "@/lib/search/types";

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const SHOW_INITIAL = 4;

export function SourcesGrid({ sources }: { sources: Source[] }) {
  const [expanded, setExpanded] = useState(false);

  if (!sources.length) return null;

  const visible = expanded ? sources : sources.slice(0, SHOW_INITIAL);
  const hidden = sources.length - SHOW_INITIAL;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs uppercase tracking-widest text-muted-foreground">
          Sources · <span className="text-foreground/60">{sources.length}</span>
        </h3>
      </div>

      <ul className="grid sm:grid-cols-2 gap-2">
        {visible.map((s, i) => {
          const d = domainOf(s.url);
          return (
            <li key={i}>
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="group flex items-start gap-3 p-3 rounded-lg border border-white/8 bg-white/[0.03] hover:bg-white/[0.07] hover:border-accent/30 transition-all"
              >
                {/* Number badge */}
                <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-accent/10 text-[10px] font-semibold text-accent/70 mt-0.5">
                  {i + 1}
                </span>

                {/* Favicon */}
                <img
                  src={`https://www.google.com/s2/favicons?sz=32&domain=${d}`}
                  alt=""
                  className="h-4 w-4 rounded mt-0.5 shrink-0 opacity-80"
                  loading="lazy"
                />

                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-accent transition-colors pr-4">
                    {s.title}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate mt-0.5">{d}</div>
                </div>

                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-accent/60 shrink-0 mt-0.5 transition-colors" />
              </a>
            </li>
          );
        })}
      </ul>

      {hidden > 0 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground hover:text-foreground transition rounded-lg border border-white/8 hover:border-white/15 hover:bg-white/[0.03]"
        >
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
          {expanded ? "Show fewer" : `Show ${hidden} more source${hidden !== 1 ? "s" : ""}`}
        </button>
      )}
    </section>
  );
}
