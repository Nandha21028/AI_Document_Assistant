import type { DocumentChunk, SourceReference } from '../../features/sessions/types';

export interface RetrievalOptions {
  topK?: number;                 // Maximum number of chunks to return (default: 3)
  minSimilarityScore?: number;   // Minimum cosine similarity threshold (default: 0.35)
  filterPageNumber?: number;     // Optional page filter
}

export interface RetrievedChunk {
  chunk: DocumentChunk;
  similarityScore: number;       // Cosine similarity score [0.0 - 1.0]
  rank: number;                  // 1-based rank (1 = best match)
  sourceReference: SourceReference;
}
