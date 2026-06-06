import type { ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { GeneralStructured } from "@/lib/search/types";
import { linkifyCitations, citationMarkdownComponents } from "@/lib/search/citations";

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
      {data.tldr && (
        <div className="p-5 rounded-xl bg-accent/10 border border-accent/30">
          <div className="text-xs uppercase tracking-widest text-accent mb-1">TL;DR</div>
          <p className="text-base leading-relaxed">{data.tldr}</p>
        </div>
      )}
      {!!data.key_facts?.length && (
        <div>
          <h2 className="font-display text-lg mb-2">Key facts</h2>
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
      {md && (
        <article className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-display prose-p:leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={factComponents}>
            {md}
          </ReactMarkdown>
        </article>
      )}
    </div>
  );
}
