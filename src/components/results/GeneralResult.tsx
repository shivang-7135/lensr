import type { ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ExternalLink, Lightbulb, ChevronRight } from "lucide-react";
import type { GeneralStructured } from "@/lib/search/types";
import { linkifyCitations, citationMarkdownComponents } from "@/lib/search/citations";
import { SafeImage } from "./SafeImage";

// ─── Accent colours cycling through sections ────────────────────────────────
const SECTION_ACCENTS = [
  "#4F46E5", // Indigo (accent-gradient-start)
  "#9333EA", // Purple (accent-gradient-end)
  "#4edea3", // Emerald (tertiary)
  "#c0c1ff", // Light Blue (primary)
  "#ddb7ff", // Light Purple (secondary)
];

/** Build ReactMarkdown component map, with card-aware inline styles. */
function markdownComponents(
  base: ComponentPropsWithoutRef<typeof ReactMarkdown>["components"],
): ComponentPropsWithoutRef<typeof ReactMarkdown>["components"] {
  return {
    ...base,
    h1: ({ children }) => (
      <h2 className="text-base font-semibold text-foreground mt-6 mb-2 first:mt-0 flex items-center gap-2">
        <span className="w-1 h-4 rounded-full bg-accent shrink-0" />
        {children}
      </h2>
    ),
    h2: ({ children }) => (
      <h3 className="text-sm font-semibold text-foreground mt-4 mb-1.5 first:mt-0 flex items-center gap-2">
        <ChevronRight className="h-3.5 w-3.5 text-accent shrink-0" />
        {children}
      </h3>
    ),
    h3: ({ children }) => (
      <h4 className="text-sm font-semibold text-foreground/80 mt-3 mb-1 first:mt-0">{children}</h4>
    ),
    p: ({ children }) => (
      <p className="text-sm leading-relaxed text-foreground/85 mb-3 last:mb-0">{children}</p>
    ),
    ul: ({ children }) => <ul className="space-y-1.5 mb-3 pl-0">{children}</ul>,
    ol: ({ children }) => <ol className="space-y-1.5 mb-3 pl-0 list-none">{children}</ol>,
    li: ({ children }) => (
      <li className="flex gap-2 text-sm leading-relaxed text-foreground/85">
        <span className="text-accent shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-accent/70 block" />
        <span className="flex-1">{children}</span>
      </li>
    ),
    strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
    em: ({ children }) => <em className="italic text-foreground/75">{children}</em>,
    hr: () => <hr className="border-border/20 my-4" />,
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-accent/40 pl-4 my-3 text-sm text-muted-foreground italic bg-accent/5 py-2 rounded-r">
        {children}
      </blockquote>
    ),
    code: ({ children }) => (
      <code className="text-xs bg-muted/60 px-1.5 py-0.5 rounded font-mono text-accent">
        {children}
      </code>
    ),
  };
}

// ─── Parse detail_markdown into named sections ──────────────────────────────
// Splits on markdown h2/h3 headings so each section becomes its own card.
type Section = { heading: string; body: string };

function parseSections(markdown: string): Section[] {
  const lines = markdown.split("\n");
  const sections: Section[] = [];
  let current: Section | null = null;

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+)/);
    const h3 = line.match(/^###\s+(.+)/);
    const heading = h2?.[1] ?? h3?.[1];

    if (heading) {
      if (current) sections.push(current);
      current = { heading, body: "" };
    } else if (current) {
      current.body += line + "\n";
    } else {
      // Content before first heading — create an unnamed intro section
      if (!sections.length) {
        current = { heading: "", body: line + "\n" };
      }
    }
  }
  if (current && (current.heading || current.body.trim())) sections.push(current);
  return sections.filter((s) => s.body.trim());
}

// ─── Main Component ─────────────────────────────────────────────────────────
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

  const sections = data.detail_markdown ? parseSections(data.detail_markdown) : [];

  return (
    <div className="space-y-4">
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

      {/* ── TL;DR card ── */}
      {data.tldr && (
        <div
          className="p-4 sm:p-5 glass-strong rounded-xl"
          style={{
            borderLeft: "3px solid",
            borderImage: "linear-gradient(to bottom, oklch(0.6 0.22 270), oklch(0.65 0.22 300)) 1",
          }}
        >
          <div className="text-xs uppercase tracking-widest text-accent mb-2 flex items-center gap-1.5">
            <Lightbulb className="h-3.5 w-3.5 text-accent" />
            Summary
          </div>
          <p className="text-sm sm:text-base leading-relaxed text-foreground/90">{data.tldr}</p>
        </div>
      )}

      {/* ── Key Facts — numbered pill list ── */}
      {!!data.key_facts?.length && (
        <div className="glass rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Key Points
          </p>
          <ol className="space-y-2 list-none pl-0">
            {data.key_facts.slice(0, 8).map((f, i) => (
              <li key={i} className="flex gap-3 items-start text-sm leading-relaxed">
                <span
                  className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white mt-0.5"
                  style={{
                    background: SECTION_ACCENTS[i % SECTION_ACCENTS.length],
                  }}
                >
                  {i + 1}
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

      {/* ── Section cards from detail_markdown ── */}
      {sections.length > 0 && (
        <div className="space-y-3">
          {sections.map((sec, idx) => (
            <div key={idx} className="glass rounded-xl overflow-hidden">
              {sec.heading && (
                <div
                  className="px-4 py-2.5 border-b border-border/20 flex items-center gap-2"
                  style={{
                    borderLeft: `3px solid ${SECTION_ACCENTS[idx % SECTION_ACCENTS.length]}`,
                  }}
                >
                  <span className="text-sm font-semibold text-foreground">{sec.heading}</span>
                </div>
              )}
              <div className="px-4 py-3">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdCmps}>
                  {linkifyCitations(sec.body.trim(), sources)}
                </ReactMarkdown>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Fallback: no sections could be parsed, dump raw markdown ── */}
      {sections.length === 0 && data.detail_markdown && (
        <div className="glass rounded-xl p-4">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdCmps}>
            {linkifyCitations(data.detail_markdown, sources)}
          </ReactMarkdown>
        </div>
      )}

      {/* ── Related links ── */}
      {!!data.related_links?.length && (
        <div className="flex flex-wrap gap-2 pt-1">
          {data.related_links.map((l, i) => (
            <a
              key={i}
              href={l.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full glass-soft hover:border-accent/60 hover:text-accent transition-colors"
            >
              {l.label} <ExternalLink className="h-3 w-3 opacity-70" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
