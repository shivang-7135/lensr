import { useState } from "react";
import type { ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronDown } from "lucide-react";

const mdCmps: ComponentPropsWithoutRef<typeof ReactMarkdown>["components"] = {
  h1: ({ children }) => (
    <h2 className="text-base font-semibold text-foreground mt-5 mb-2 first:mt-0">{children}</h2>
  ),
  h2: ({ children }) => (
    <h3 className="text-sm font-semibold text-foreground mt-4 mb-1.5 first:mt-0">{children}</h3>
  ),
  h3: ({ children }) => (
    <h4 className="text-sm font-medium text-foreground mt-3 mb-1 first:mt-0">{children}</h4>
  ),
  p: ({ children }) => (
    <p className="text-sm leading-relaxed text-foreground/90 mb-3 last:mb-0">{children}</p>
  ),
  ul: ({ children }) => <ul className="space-y-1.5 mb-3 pl-0">{children}</ul>,
  ol: ({ children }) => <ol className="space-y-1.5 mb-3 pl-0 list-none">{children}</ol>,
  li: ({ children }) => (
    <li className="flex gap-2 text-sm leading-relaxed text-foreground/90">
      <span className="text-accent shrink-0 mt-0.5">•</span>
      <span>{children}</span>
    </li>
  ),
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  hr: () => <hr className="border-border/30 my-4" />,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent underline-offset-2 hover:underline"
    >
      {children}
    </a>
  ),
};

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
          <div className="glass p-5 space-y-0">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdCmps}>
              {markdown}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
