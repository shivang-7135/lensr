import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Copy, Check, MapPin } from "lucide-react";
import type { InstaStructured } from "@/lib/search/types";

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1200); }}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-accent transition"
    >
      {done ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {done ? "Copied" : "Copy"}
    </button>
  );
}

export function InstaResult({ data }: { data: InstaStructured }) {
  const allHashtags = (data.hashtags ?? []).join(" ");

  return (
    <div className="space-y-6">
      {(data.scene || data.mood) && (
        <div className="p-5 rounded-xl bg-accent/10 border border-accent/30">
          {data.scene && <p className="text-base leading-relaxed">{data.scene}</p>}
          {data.mood && <div className="text-xs uppercase tracking-widest text-accent mt-2">Mood: {data.mood}</div>}
        </div>
      )}

      {!!data.captions?.length && (
        <div className="grid md:grid-cols-2 gap-3">
          {data.captions.map((c, i) => (
            <div key={i} className="p-4 rounded-xl border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest text-accent font-medium">{c.style}</span>
                <CopyButton text={c.text} />
              </div>
              <p className="text-sm leading-relaxed">{c.text}</p>
            </div>
          ))}
        </div>
      )}

      {!!data.hashtags?.length && (
        <div className="p-4 rounded-xl border border-border">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display text-lg">Hashtags</h2>
            <CopyButton text={allHashtags} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.hashtags.map((h, i) => <span key={i} className="text-sm px-2 py-0.5 rounded-full bg-secondary">{h}</span>)}
          </div>
        </div>
      )}

      {!!data.place_suggestions?.length && (
        <div>
          <h2 className="font-display text-lg mb-2">Similar / nearby spots</h2>
          <ul className="space-y-2">
            {data.place_suggestions.map((p, i) => (
              <li key={i} className="p-3 rounded-lg border border-border">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium text-sm">
                      {p.url ? <a href={p.url} target="_blank" rel="noreferrer" className="hover:text-accent underline-offset-4 hover:underline">{p.name}</a> : p.name}
                    </div>
                    {p.why && <div className="text-xs text-muted-foreground">{p.why}</div>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.detail_markdown && (
        <article className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-display">
          <ReactMarkdown>{data.detail_markdown}</ReactMarkdown>
        </article>
      )}
    </div>
  );
}
