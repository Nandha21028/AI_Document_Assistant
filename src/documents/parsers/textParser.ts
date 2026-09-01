import type { ParsedDocument, ParsedPage, ParseProgressCallback } from './types';

/**
 * Parses plain text, Markdown, CSV, and JSON files directly in the browser.
 */
export async function parseTextDocument(
  file: File,
  onProgress?: ParseProgressCallback
): Promise<ParsedDocument> {
  onProgress?.({
    currentPage: 1,
    totalPages: 1,
    status: `Reading text file ${file.name}...`,
  });

  const text = await file.text();
  const trimmed = text.trim();

  if (trimmed.length === 0) {
    throw new Error('The uploaded text document is empty.');
  }

  // If Markdown has explicit page breaks (---), split into logical pages
  const isMarkdown = file.name.endsWith('.md');
  let pages: ParsedPage[] = [];

  if (isMarkdown && trimmed.includes('\n---\n')) {
    const rawPages = trimmed.split(/\n---\n/);
    pages = rawPages.map((pageText, idx) => ({
      pageNumber: idx + 1,
      text: pageText.trim(),
    }));
  } else {
    pages = [
      {
        pageNumber: 1,
        text: trimmed,
      },
    ];
  }

  return {
    id: crypto.randomUUID(),
    name: file.name,
    size: file.size,
    type: file.type || 'text/plain',
    pageCount: pages.length,
    pages,
    fullText: trimmed,
  };
}
