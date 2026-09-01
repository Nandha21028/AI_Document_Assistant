import React from 'react';
import type { SourceReference } from '../sessions/types';

interface GroundedTextRendererProps {
  content: string;
  sources?: SourceReference[];
  onSelectSource?: (source: SourceReference) => void;
}

export const GroundedTextRenderer: React.FC<GroundedTextRendererProps> = ({
  content,
  sources = [],
  onSelectSource,
}) => {
  if (!content) return null;

  // Regular expression to match citation tags like [1], [2], [1, 2], [1][2]
  const citationRegex = /\[(\d+(?:\s*,\s*\d+)*)\]/g;

  const renderInlineFormatted = (text: string) => {
    // 1. Process citations
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = citationRegex.exec(text)) !== null) {
      const matchIndex = match.index;
      const fullMatch = match[0];
      const numbersString = match[1];

      // Push preceding text with bold parsing
      if (matchIndex > lastIndex) {
        parts.push(renderBoldText(text.substring(lastIndex, matchIndex), `pre-${lastIndex}`));
      }

      // Parse citation numbers (e.g. "1" or "1, 2")
      const sourceIndices = numbersString
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n) && n > 0);

      sourceIndices.forEach((sourceNum) => {
        const sourceIndex = sourceNum - 1;
        const source = sources[sourceIndex];

        if (source) {
          const pageLabel = source.pageNumber ? `p.${source.pageNumber}` : 'src';
          parts.push(
            <button
              key={`citation-${matchIndex}-${sourceNum}`}
              onClick={() => onSelectSource?.(source)}
              className="inline-flex items-center mx-1 px-2 py-0.5 rounded-md skeuo-btn text-emerald-700 dark:text-emerald-400 font-mono text-xs font-black transition-all hover:scale-105 select-none align-baseline cursor-pointer shadow-sm border border-emerald-500/50 bg-emerald-500/10"
              title={`View citation from ${source.documentName} (${source.pageNumber ? `Page ${source.pageNumber}` : 'Document'}${source.sectionTitle ? ` - ${source.sectionTitle}` : ''})`}
            >
              [{sourceNum}: {pageLabel}]
            </button>
          );
        } else {
          parts.push(
            <span
              key={`citation-raw-${matchIndex}-${sourceNum}`}
              className="inline-flex items-center mx-1 px-1.5 py-0.5 rounded skeuo-well text-xs font-mono font-bold text-chat-muted"
            >
              [{sourceNum}]
            </span>
          );
        }
      });

      lastIndex = matchIndex + fullMatch.length;
    }

    // Push remaining text
    if (lastIndex < text.length) {
      parts.push(renderBoldText(text.substring(lastIndex), `post-${lastIndex}`));
    }

    return parts;
  };

  // Helper to render **bold** text
  const renderBoldText = (raw: string, keyPrefix: string): React.ReactNode => {
    if (!raw.includes('**')) return <span key={keyPrefix}>{raw}</span>;

    const segments = raw.split(/(\*\*[^*]+\*\*)/g);
    return (
      <span key={keyPrefix}>
        {segments.map((seg, i) => {
          if (seg.startsWith('**') && seg.endsWith('**')) {
            const boldContent = seg.slice(2, -2);
            return (
              <strong key={`${keyPrefix}-b-${i}`} className="font-black text-chat-text">
                {boldContent}
              </strong>
            );
          }
          return seg;
        })}
      </span>
    );
  };

  // Split content by lines to format bullet points, lists, and paragraphs cleanly
  const lines = content.split('\n');

  return (
    <div className="space-y-2 text-chat-text text-sm sm:text-[15px] leading-relaxed font-sans select-text">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={`empty-${idx}`} className="h-1.5" />;
        }

        // Bullet point lines (- or * or •)
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
          const bulletText = trimmed.slice(2);
          return (
            <div key={`line-${idx}`} className="flex items-start space-x-2 ml-2 sm:ml-3">
              <span className="text-chat-accent font-bold mt-1 text-xs">•</span>
              <div className="flex-1 min-w-0 font-medium text-chat-text">
                {renderInlineFormatted(bulletText)}
              </div>
            </div>
          );
        }

        // Numbered list lines (1. or 2. etc.)
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          const num = numMatch[1];
          const listText = numMatch[2];
          return (
            <div key={`line-${idx}`} className="flex items-start space-x-2.5 ml-2 sm:ml-3">
              <span className="font-mono text-xs font-black text-chat-accent mt-0.5 shrink-0">
                {num}.
              </span>
              <div className="flex-1 min-w-0 font-medium text-chat-text">
                {renderInlineFormatted(listText)}
              </div>
            </div>
          );
        }

        // Normal paragraph line
        return (
          <p key={`line-${idx}`} className="font-medium text-chat-text leading-relaxed">
            {renderInlineFormatted(line)}
          </p>
        );
      })}
    </div>
  );
};
