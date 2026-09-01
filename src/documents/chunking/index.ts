import type { ParsedDocument } from '../parsers/types';
import type { DocumentChunk } from '../../features/sessions/types';
import type { ChunkingOptions } from './types';
import { chunkPage } from './recursiveChunker';

export * from './types';
export * from './recursiveChunker';

export const DEFAULT_CHUNKING_OPTIONS: ChunkingOptions = {
  chunkSize: 500,
  chunkOverlap: 80,
  minChunkSize: 40,
};

/**
 * Splits an entire ParsedDocument page-by-page and converts them into structured DocumentChunk records ready for IndexedDB.
 */
export function chunkParsedDocument(
  doc: ParsedDocument,
  sessionId: string,
  options: Partial<ChunkingOptions> = {}
): DocumentChunk[] {
  const mergedOptions: ChunkingOptions = {
    ...DEFAULT_CHUNKING_OPTIONS,
    ...options,
  };

  const allChunks: DocumentChunk[] = [];
  let chunkIndex = 0;

  for (const page of doc.pages) {
    const pageChunks = chunkPage(page.text, page.pageNumber, mergedOptions);

    for (const rawChunk of pageChunks) {
      allChunks.push({
        id: `${doc.id}_chunk_${chunkIndex}`,
        sessionId,
        documentId: doc.id,
        documentName: doc.name,
        chunkIndex,
        pageNumber: rawChunk.pageNumber,
        sectionTitle: rawChunk.sectionTitle,
        text: rawChunk.text,
        tokenCount: rawChunk.tokenCount,
      });

      chunkIndex++;
    }
  }

  return allChunks;
}
