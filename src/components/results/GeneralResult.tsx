import type { ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ExternalLink, Lightbulb, BookOpen, List, ArrowRight } from "lucide-react";
import type { GeneralStructured } from "@/lib/search/types";
import { linkifyCitations, citationMarkdownComponents } from "@/lib/search/citations";
import { SafeImage } from "./SafeImage";

// Parse markdown into sections for better display
function parseMarkdownSections(md: string): { heading: string; content: string }[] {
  if (!md) return [];
  const sections: { heading: string; content: string }[] = [];
  const lines = md.split("\n");
  let currentHeading = "";
  let currentContent: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)/);
    if (headingMatch) {
      if (currentHeading || currentContent.length) {
        sections.push({ heading: currentHeading, content: currentContent.join("\n").trim() });
      }
      currentHeading = headingMatch[1];
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }
  if (currentHeading || currentContent.length) {
    sections.push({ heading: currentHeading, content: currentContent.join("\n").trim() });
  }
  return sections.filter((s) => s.content || s.heading);
}

// Extract bullet items from content
function extractItems(content: string): string[] {
  return content
    .split("\n")
    .filter((l) => l.match(/^[-*•]\s+\*?\*?/))
    .map((l) =>
      l
        .replace(/^[-*•]\s+/, "")
        .replace(/\*\*/g, "")
        .trim(),
    )
    .filter(Boolean)
    .slice(0, 8);
}

export function GeneralResult({
  data,
  sources = [],
}: {
  data: GeneralStructured;
  sources?: { title: string; url: string }[];
}) {
  const factComponents = citationMarkdownComponents(sources) as ComponentPropsWithoutRef<
    typeof ReactMarkdown
  >["components"];
  const sections = parseMarkdownSections(data.detail_markdown ?? "");

  // Check if we have structured content or just raw markdown
  const hasStructuredContent = data.tldr || data.key_facts?.length;

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

      {/* TL;DR Summary Card */}
      {data.tldr && (
        <div
          className="p-5 glass-strong fade-up-enhanced"
          style={{
            borderLeft: '3px solid',
            borderImage: 'linear-gradient(to bottom, oklch(0.6 0.22 270), oklch(0.65 0.22 300)) 1',
          }}
        >
          <div className="text-xs uppercase tracking-widest text-accent mb-2 flex items-center gap-1.5">
            <Lightbulb className="h-5 w-5 text-accent drop-shadow-[0_0_6px_oklch(0.6_0.22_270)]" /> Summary
          </div>
          <p className="text-lg leading-relaxed">{data.tldr}</p>
        </div>
      )}

      {/* Key Facts as Cards */}
      {!!data.key_facts?.length && (
        <div className="space-y-3 fade-up-enhanced">
          <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <List className="h-4 w-4" /> Key Points
          </h2>
          <div className="grid gap-2">
            {data.key_facts.slice(0, 6).map((f, i) => (
              <div
                key={i}
                className="glass-soft rounded-xl p-3 glass-hover flex gap-3 items-start fade-up-enhanced"
                style={{ animationDelay: `${(i + 1) * 100}ms` }}
              >
                <span className="gradient-badge shrink-0">{i + 1}</span>
                <span className="text-sm leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={factComponents}>
                    {linkifyCitations(f, sources)}
                  </ReactMarkdown>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Parsed Sections - Only if we have meaningful sections */}
      {sections.length > 0 && sections.some((s) => s.heading) && (
        <div className="space-y-4">
          {sections.map((section, i) => {
            const items = extractItems(section.content);
            const hasItems = items.length > 0;
            const plainContent = section.content.replace(/^[-*•]\s+.+\n?/gm, "").trim();

            if (!section.heading && !hasItems && !plainContent) return null;

            return (
              <div key={i}>
                {i > 0 && (
                  <div className="border-t border-border/30 mb-4" />
                )}
                <div
                  className="glass p-4 space-y-3 fade-up-enhanced"
                  style={{ animationDelay: `${(i + 1) * 120}ms` }}
                >
                  {section.heading && (
                    <h3 className="font-display font-semibold text-base flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-accent" />
                      {section.heading}
                    </h3>
                  )}
                  {hasItems && (
                    <ul className="space-y-2">
                      {items.map((item, j) => (
                        <li key={j} className="flex gap-2 text-sm">
                          <ArrowRight className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {plainContent && !hasItems && (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {plainContent.slice(0, 300)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fallback: If no structured content, show clean formatted markdown */}
      {!hasStructuredContent && !sections.some((s) => s.heading) && data.detail_markdown && (
        <article className="glass p-5 prose prose-invert prose-sm max-w-none prose-headings:font-display prose-p:leading-relaxed prose-a:text-accent prose-strong:text-foreground prose-li:my-0.5 animate-in fade-in duration-500">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={factComponents}>
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
