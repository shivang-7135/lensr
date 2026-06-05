import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { StreamEvent, SearchIntent } from "@/lib/search/types";

const INTENT_LABEL: Record<SearchIntent, string> = {
  shopping: "Shopping",
  price_history: "Price history",
  trip: "Trip planner",
  insta: "Instagram",
  general: "General",
};

export function ResultsStream({ query }: { query: string }) {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [answer, setAnswer] = useState("");
  const [intent, setIntent] = useState<SearchIntent | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setEvents([]); setAnswer(""); setIntent(null); setDone(false); setError(null);
    const ctl = new AbortController();
    abortRef.current = ctl;

    (async () => {
      try {
        const resp = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
          signal: ctl.signal,
        });
        if (!resp.ok || !resp.body) {
          setError(`Request failed (${resp.status})`);
          return;
        }
        const reader = resp.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        while (true) {
          const { done: rd, value } = await reader.read();
          if (rd) break;
          buf += dec.decode(value, { stream: true });
          let nl: number;
          while ((nl = buf.indexOf("\n\n")) !== -1) {
            const chunk = buf.slice(0, nl);
            buf = buf.slice(nl + 2);
            for (const line of chunk.split("\n")) {
              if (!line.startsWith("data: ")) continue;
              try {
                const ev = JSON.parse(line.slice(6)) as StreamEvent;
                setEvents((prev) => [...prev, ev]);
                if (ev.type === "intent_detected") setIntent(ev.intent);
                if (ev.type === "partial_answer") setAnswer((p) => p + ev.delta);
                if (ev.type === "final") { setAnswer(ev.markdown); setDone(true); }
                if (ev.type === "error") setError(ev.message);
              } catch { /* ignore */ }
            }
          }
        }
        setDone(true);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError((e as Error).message);
      }
    })();

    return () => ctl.abort();
  }, [query]);

  const sources = events.flatMap((e) => (e.type === "final" ? e.sources : []));
  const toolEvents = events.filter((e) => e.type === "tool_call" || e.type === "tool_result");

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-8">
      <article className="space-y-4">
        <div className="flex items-center gap-3">
          {intent && (
            <span className="text-xs uppercase tracking-widest px-2 py-1 rounded-full bg-accent text-accent-foreground font-medium">
              {INTENT_LABEL[intent]}
            </span>
          )}
          {!done && (
            <span className="text-xs text-muted-foreground inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-signal animate-pulse" /> thinking…
            </span>
          )}
        </div>

        {error && (
          <div className="p-4 border border-destructive/40 bg-destructive/10 rounded-lg text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-display">
          {answer ? <ReactMarkdown>{answer}</ReactMarkdown> : (
            <div className="space-y-2">
              <div className="h-4 w-2/3 bg-secondary rounded animate-pulse" />
              <div className="h-4 w-1/2 bg-secondary rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-secondary rounded animate-pulse" />
            </div>
          )}
        </div>
      </article>

      <aside className="space-y-6">
        <section>
          <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Agent steps</h3>
          <ol className="space-y-2 text-sm">
            {toolEvents.length === 0 && <li className="text-muted-foreground">No tool calls yet.</li>}
            {toolEvents.map((e, i) => (
              <li key={i} className="border-l-2 border-accent pl-3 py-1">
                {e.type === "tool_call" ? (
                  <><span className="font-mono text-xs text-muted-foreground">call</span> <span className="font-medium">{e.tool}</span><div className="text-xs text-muted-foreground truncate">{e.input}</div></>
                ) : (
                  <><span className="font-mono text-xs text-signal">result</span> <span className="font-medium">{e.tool}</span><div className="text-xs text-muted-foreground">{e.summary}</div></>
                )}
              </li>
            ))}
          </ol>
        </section>
        {sources.length > 0 && (
          <section>
            <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Sources</h3>
            <ul className="space-y-2 text-sm">
              {sources.map((s, i) => (
                <li key={i}><a href={s.url} target="_blank" rel="noreferrer" className="underline decoration-accent underline-offset-4 hover:text-accent">{s.title}</a></li>
              ))}
            </ul>
          </section>
        )}
      </aside>
    </div>
  );
}
