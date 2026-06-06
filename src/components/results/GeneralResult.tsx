import type { ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ExternalLink } from "lucide-react";
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
  const md = linkifyCitations(data.detail_markdown ?? "", sources);
  const factComponents = citationMarkdownComponents(sources) as ComponentPropsWithoutRef<typeof ReactMarkdown>["components"];

  return (
    <div className="space-y-6">
      {data.hero_image_url && (
        <div className="glass overflow-hidden aspect-[21/9] p-0">
          <SafeImage src={data.hero_image_url} alt="" className="w-full h-full object-cover" fallbackClassName="w-full h-full" />
        </div>
      )}
      {data.tldr && (
        <div className="p-5 glass-strong">
          <div className="text-xs uppercase tracking-widest text-accent mb-1">TL;DR</div>
          <p className="text-base leading-relaxed">{data.tldr}</p>
        </div>
      )}
      {!!data.key_facts?.length && (
        <div className="glass p-5">
          <h2 className="font-display text-lg mb-3">Key facts</h2>
          <ul className="space-y-1.5">
            {data.key_facts.map((f, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="text-accent mt-1">▸</span>
                <span>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={factComponents}>
                    {linkifyCitations(f, sources)}
                  </ReactMarkdown>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {!!data.related_links?.length && (
        <div className="flex flex-wrap gap-2">
          {data.related_links.map((l, i) => (
            <a key={i} href={l.url} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full glass-soft hover:border-accent/60 hover:text-accent transition">
              {l.label} <ExternalLink className="h-3 w-3 opacity-70" />
            </a>
          ))}
        </div>
      )}
      {md && (
        <article className="prose prose-invert max-w-none prose-headings:font-display prose-p:leading-relaxed prose-a:text-accent prose-strong:text-foreground">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={factComponents}>
            {md}
          </ReactMarkdown>
        </article>
      )}
    </div>
  );
}
