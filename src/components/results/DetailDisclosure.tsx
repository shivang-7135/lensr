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
        className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-full glass-soft hover:border-accent/60 hover:text-accent hover:shadow-[0_0_12px_oklch(0.6_0.22_270/0.15)] active:scale-[0.97] transition-all duration-200"
      >
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
        {open ? "Hide full analysis" : label}
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${open ? "grid-rows-[1fr] opacity-100 mt-4" : "grid-rows-[0fr] opacity-0 mt-0"}`}
      >
        <div className="overflow-hidden">
          <article className="prose dark:prose-invert max-w-none prose-headings:font-display prose-a:text-accent prose-sm glass p-5">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
          </article>
        </div>
      </div>
    </div>
  );
}
