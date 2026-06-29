import type { ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ExternalLink, Lightbulb } from "lucide-react";
import type { GeneralStructured } from "@/lib/search/types";
import { linkifyCitations, citationMarkdownComponents } from "@/lib/search/citations";
import { SafeImage } from "./SafeImage";

export function GeneralResult({
  data,
  sources = [],
}: {
  data: GeneralStructured;
  sources?: { title: string; url: string }[];
}) {
  const mdComponents = citationMarkdownComponents(sources) as ComponentPropsWithoutRef<
    typeof ReactMarkdown
  >["components"];

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
          <div className="text-sm sm:text-base leading-relaxed prose dark:prose-invert prose-sm max-w-none prose-strong:text-foreground prose-p:m-0">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
              {linkifyCitations(data.tldr, sources)}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Key Facts — clean numbered list, no cards */}
      {!!data.key_facts?.length && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
            Key Points
          </p>
          <ol className="space-y-2">
            {data.key_facts.slice(0, 8).map((f, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed">
                <span className="text-accent font-mono text-xs font-bold mt-0.5 w-4 shrink-0 tabular-nums">
                  {i + 1}.
                </span>
                <span className="prose dark:prose-invert prose-sm max-w-none prose-strong:text-foreground prose-p:m-0 prose-p:inline">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                    {linkifyCitations(f, sources)}
                  </ReactMarkdown>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Full markdown body — rendered as clean readable prose */}
      {data.detail_markdown && (
        <article
          className={[
            "prose dark:prose-invert max-w-none",
            "prose-headings:font-semibold prose-headings:text-foreground prose-headings:mt-6 prose-headings:mb-2",
            "prose-h2:text-base prose-h3:text-sm",
            "prose-p:text-sm prose-p:leading-relaxed prose-p:text-foreground/90",
            "prose-li:text-sm prose-li:leading-relaxed prose-li:my-0.5",
            "prose-strong:text-foreground prose-strong:font-semibold",
            "prose-a:text-accent prose-a:no-underline hover:prose-a:underline",
            "prose-hr:border-border/30",
            "prose-blockquote:border-l-accent prose-blockquote:text-muted-foreground",
          ].join(" ")}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
            {linkifyCitations(data.detail_markdown, sources)}
          </ReactMarkdown>
        </article>
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
