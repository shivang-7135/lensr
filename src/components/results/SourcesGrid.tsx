import type { Source } from "@/lib/search/types";

function domainOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

export function SourcesGrid({ sources }: { sources: Source[] }) {
  if (!sources.length) return null;
  return (
    <section>
      <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Sources</h3>
      <ul className="grid sm:grid-cols-2 gap-2">
        {sources.map((s, i) => {
          const d = domainOf(s.url);
          return (
            <li key={i}>
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-3 p-3 glass glass-hover group"
              >
                <img
                  src={`https://www.google.com/s2/favicons?sz=32&domain=${d}`}
                  alt=""
                  className="h-5 w-5 rounded mt-0.5"
                  loading="lazy"
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-accent transition-colors">{s.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{d}</div>
                </div>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
