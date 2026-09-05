import * as pdfjsLib from 'pdfjs-dist';
import type { ParsedDocument, ParsedPage, ParseProgressCallback } from './types';

// Set up PDF.js worker locally for true 100% air-gapped / offline operation
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
}

/**
 * Parses a PDF file page-by-page in the browser.
 */
export async function parsePdfDocument(
  file: File,
  onProgress?: ParseProgressCallback
): Promise<ParsedDocument> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useSystemFonts: true,
    disableFontFace: false,
  });

  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;
  const parsedPages: ParsedPage[] = [];
  const fullTextParts: string[] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    onProgress?.({
      currentPage: pageNum,
      totalPages,
      status: `Extracting page ${pageNum} of ${totalPages}...`,
    });

    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Group text items and construct clean page text
    const pageText = textContent.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    parsedPages.push({
      pageNumber: pageNum,
      text: pageText,
    });

    if (pageText) {
      fullTextParts.push(`[Page ${pageNum}]\n${pageText}`);
    }
  }

  const fullText = fullTextParts.join('\n\n');

  // Check if PDF is an empty or scanned image document
  if (fullText.trim().length === 0) {
    throw new Error(
      'No extractable text was found in this PDF. It appears to be a scanned image or empty document.'
    );
  }

  return {
    id: crypto.randomUUID(),
    name: file.name,
    size: file.size,
    type: file.type || 'application/pdf',
    pageCount: totalPages,
    pages: parsedPages,
    fullText,
  };
}
