import type { ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ExternalLink, Lightbulb } from "lucide-react";
import type { GeneralStructured } from "@/lib/search/types";
import { linkifyCitations, citationMarkdownComponents } from "@/lib/search/citations";
import { SafeImage } from "./SafeImage";

/** Custom ReactMarkdown components with explicit Tailwind classes.
 *  @tailwindcss/typography is NOT installed, so we style every element manually.
 */
function markdownComponents(
  base: ComponentPropsWithoutRef<typeof ReactMarkdown>["components"],
): ComponentPropsWithoutRef<typeof ReactMarkdown>["components"] {
  return {
    ...base,
    h1: ({ children }) => (
      <h2 className="text-lg font-semibold text-foreground mt-6 mb-2 first:mt-0">{children}</h2>
    ),
    h2: ({ children }) => (
      <h3 className="text-base font-semibold text-foreground mt-5 mb-1.5 first:mt-0">{children}</h3>
    ),
    h3: ({ children }) => (
      <h4 className="text-sm font-semibold text-foreground mt-4 mb-1 first:mt-0">{children}</h4>
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
    em: ({ children }) => <em className="italic text-foreground/80">{children}</em>,
    hr: () => <hr className="border-border/30 my-4" />,
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-accent/40 pl-4 my-3 text-sm text-muted-foreground italic">
        {children}
      </blockquote>
    ),
    code: ({ children }) => (
      <code className="text-xs bg-muted/50 px-1.5 py-0.5 rounded font-mono text-accent">
        {children}
      </code>
    ),
  };
}

export function GeneralResult({
  data,
  sources = [],
}: {
  data: GeneralStructured;
  sources?: { title: string; url: string }[];
}) {
  const citationCmps = citationMarkdownComponents(sources) as ComponentPropsWithoutRef<
    typeof ReactMarkdown
  >["components"];
  const mdCmps = markdownComponents(citationCmps);

  return (
    <div className="space-y-5">
      {data.hero_image_url && (
        <div className="glass overflow-hidden aspect-[21/9] p-0">
          <SafeImage
            src={data.hero_image_url}
            alt=""
            className="w-full h-full object-cover"
            fallbackClassName="w-full h-full"
          />
        </div>
      )}

      {/* TL;DR */}
      {data.tldr && (
        <div
          className="p-4 sm:p-5 glass-strong"
          style={{
            borderLeft: "3px solid",
            borderImage: "linear-gradient(to bottom, oklch(0.6 0.22 270), oklch(0.65 0.22 300)) 1",
          }}
        >
          <div className="text-xs uppercase tracking-widest text-accent mb-2 flex items-center gap-1.5">
            <Lightbulb className="h-4 w-4 text-accent" /> Summary
          </div>
          <p className="text-sm sm:text-base leading-relaxed text-foreground/90">{data.tldr}</p>
        </div>
      )}

      {/* Key Facts — clean numbered list */}
      {!!data.key_facts?.length && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
            Key Points
          </p>
          <ol className="space-y-2.5 list-none pl-0">
            {data.key_facts.slice(0, 8).map((f, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed">
                <span className="text-accent font-mono text-xs font-bold mt-0.5 w-5 shrink-0 tabular-nums">
                  {i + 1}.
                </span>
                <span className="text-foreground/90 flex-1">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdCmps}>
                    {linkifyCitations(f, sources)}
                  </ReactMarkdown>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Full markdown body */}
      {data.detail_markdown && (
        <div className="border-t border-border/20 pt-5">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdCmps}>
            {linkifyCitations(data.detail_markdown, sources)}
          </ReactMarkdown>
        </div>
      )}

      {/* Related Links */}
      {!!data.related_links?.length && (
        <div className="flex flex-wrap gap-2 pt-2">
          {data.related_links.map((l, i) => (
            <a
              key={i}
              href={l.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full glass-soft hover:border-accent/60 hover:text-accent transition"
            >
              {l.label} <ExternalLink className="h-3 w-3 opacity-70" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
