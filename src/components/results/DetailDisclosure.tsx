import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronDown } from "lucide-react";

export function DetailDisclosure({
  markdown,
  label = "Show full analysis",
}: {
  markdown?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  if (!markdown) return null;
  return (
    <div className="pt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full glass-soft hover:border-accent/50 hover:text-accent transition"
      >
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        {open ? "Hide full analysis" : label}
      </button>
      {open && (
        <article className="prose prose-invert max-w-none prose-headings:font-display prose-a:text-accent mt-4 prose-sm glass p-5">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
        </article>
      )}
    </div>
  );
}
