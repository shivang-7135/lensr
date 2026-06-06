import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronDown } from "lucide-react";

export function DetailDisclosure({ markdown, label = "Show full analysis" }: { markdown?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  if (!markdown) return null;
  return (
    <div className="border-t border-border/60 pt-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition"
      >
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        {open ? "Hide full analysis" : label}
      </button>
      {open && (
        <article className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-display mt-4 prose-sm">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
        </article>
      )}
    </div>
  );
}
