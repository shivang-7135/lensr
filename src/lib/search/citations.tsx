import type { ComponentPropsWithoutRef, ReactNode } from "react";
import ReactMarkdown from "react-markdown";

export type CitationSource = { title: string; url: string };

/**
 * Convert `[1]`, `[2]` references to clickable markdown links pointing at
 * the corresponding source URL. Only converts when the index is in range.
 */
export function linkifyCitations(md: string, sources: CitationSource[]): string {
  if (!md || !sources?.length) return md;
  return md.replace(/\[(\d+)\]/g, (match, numStr: string) => {
    const n = parseInt(numStr, 10);
    const src = sources[n - 1];
    if (!src?.url) return match;
    return `[\\[${n}\\]](${src.url} "${escapeTitle(src.title || src.url)}")`;
  });
}

function escapeTitle(t: string): string {
  return t.replace(/"/g, "'").slice(0, 120);
}

type MdComponents = NonNullable<ComponentPropsWithoutRef<typeof ReactMarkdown>["components"]>;

/**
 * Custom ReactMarkdown components that render citation links as small,
 * pill-style superscript anchors.
 */
export function citationMarkdownComponents(sources: CitationSource[]): MdComponents {
  return {
    a: ({ href, children, ...rest }) => {
      const text = Array.isArray(children) ? children.join("") : String(children ?? "");
      const isCitation = /^\[\d+\]$/.test(text.trim());
      if (isCitation && href) {
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center align-super text-[10px] font-medium mx-0.5 px-1.5 py-0.5 rounded-full bg-accent/15 text-accent hover:bg-accent/25 no-underline"
            {...rest}
          >
            {text.replace(/[[\]]/g, "") as ReactNode}
          </a>
        );
      }
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline-offset-2 hover:underline"
          {...rest}
        >
          {children}
        </a>
      );
    },
  };
}
