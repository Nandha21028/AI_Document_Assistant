import { embeddingService } from '../embeddings';
import { chunkRepository } from '../../storage';
import { cosineSimilarity } from './similarity';
import type { RetrievalOptions, RetrievedChunk } from './types';
import type { DocumentChunk, SourceReference } from '../../features/sessions/types';

export const retriever = {
  /**
   * Retrieves the top-K semantically relevant document chunks for a query strictly within the given session.
   */
  async retrieve(
    query: string,
    sessionId: string,
    options: RetrievalOptions = {}
  ): Promise<RetrievedChunk[]> {
    const { topK = 3, minSimilarityScore = 0.35, filterPageNumber } = options;

    const trimmedQuery = query.trim();
    if (!trimmedQuery) return [];

    // 1. Embed query in the background worker
    const queryVector = await embeddingService.embedQuery(trimmedQuery);

    // 2. Fetch session-scoped chunks from IndexedDB
    let chunks = await chunkRepository.getBySessionId(sessionId);

    if (filterPageNumber) {
      chunks = chunks.filter((c) => c.pageNumber === filterPageNumber);
    }

    if (chunks.length === 0) return [];

    // 3. Detect query intent: Specific Entity Lookup vs. Dataset-Wide Aggregation
    const isSpecificLookup =
      /\b(is|are|was|were|which|who|whom|when|where|status of|price of|author of|genre of|year of|availability of)\b/i.test(
        trimmedQuery
      );

    const isDatasetLevelQuery =
      !isSpecificLookup &&
      /(how many|total|all|count|number of|sum|average|avg|every|list all|distinct|different|represented|unique|overall|dataset summary|workbook summary|breakdown)/i.test(
        trimmedQuery
      );

    // 4. Identify Dataset / Workbook Profile / Overview chunk if present
    const overviewChunk = chunks.find(
      (c) =>
        (c.pageNumber === 1 || c.chunkIndex === 0) &&
        (c.sectionTitle?.toLowerCase().includes('overview') ||
          c.sectionTitle?.toLowerCase().includes('profile') ||
          c.sectionTitle?.toLowerCase().includes('statistic') ||
          c.text.includes('=== DATASET OVERVIEW') ||
          c.text.includes('=== SPREADSHEET OVERVIEW') ||
          c.text.includes('=== WORKBOOK OVERVIEW'))
    );

    // 5. Compute cosine similarity for each chunk with exact entity and phrase boosting
    const scoredChunks: { chunk: DocumentChunk; score: number }[] = [];

    const stopWords = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'what', 'which', 'where', 'when', 'who', 'how', 'are', 'was', 'were', 'does', 'did']);
    const queryTerms = trimmedQuery.toLowerCase().split(/[\s,;:?]+/).filter((t) => t.length > 2 && !stopWords.has(t));

    const cleanedQueryPhrase = trimmedQuery
      .replace(/^(is|are|was|were|who|what|where|which|available|tell me about)\s+/i, '')
      .replace(/[?.,!]+$/g, '')
      .trim()
      .toLowerCase();

    for (const chunk of chunks) {
      const isThisOverview = overviewChunk && chunk.id === overviewChunk.id;

      if (isThisOverview && isDatasetLevelQuery) {
        // Authoritative dataset profile gets high priority for global queries
        scoredChunks.push({
          chunk,
          score: 0.99,
        });
        continue;
      }

      if (chunk.embedding && chunk.embedding.length > 0) {
        let score = cosineSimilarity(queryVector, chunk.embedding);
        const chunkTextLower = chunk.text.toLowerCase();

        // Exact-word boost for names, IDs, dates, and products
        let termMatches = 0;
        for (const term of queryTerms) {
          if (chunkTextLower.includes(term)) {
            termMatches++;
          }
        }

        if (queryTerms.length > 0 && termMatches > 0) {
          score += (termMatches / queryTerms.length) * 0.2; // Up to 0.2 boost
        }

        // Heavy boost if specific entity phrase is found in the chunk (e.g. "blue horizon", "david lee", "ord-1002")
        if (cleanedQueryPhrase.length > 3 && chunkTextLower.includes(cleanedQueryPhrase)) {
          score += 0.35;
        }

        const effectiveMinScore = isDatasetLevelQuery ? Math.min(minSimilarityScore, 0.2) : minSimilarityScore;

        if (score >= effectiveMinScore) {
          scoredChunks.push({
            chunk,
            score: Math.min(1.0, score),
          });
        }
      }
    }

    // 6. Sort descending by score
    scoredChunks.sort((a, b) => b.score - a.score);

    // 7. Adaptive Top-K: If the dataset is small (<= 10 chunks), retrieve more chunks for complete context
    const adaptiveTopK = chunks.length <= 10
      ? Math.max(topK, chunks.length)
      : isDatasetLevelQuery
      ? Math.max(topK, 6)
      : topK;

    let selectedChunks = scoredChunks.slice(0, adaptiveTopK);

    // Ensure overview chunk is included if it exists and query is dataset-level
    if (overviewChunk && isDatasetLevelQuery) {
      const alreadyIncluded = selectedChunks.some((s) => s.chunk.id === overviewChunk.id);
      if (!alreadyIncluded) {
        selectedChunks.unshift({ chunk: overviewChunk, score: 0.95 });
      }
    }

    return selectedChunks.map((item, index) => {
      const sourceRef: SourceReference = {
        chunkId: item.chunk.id,
        documentName: item.chunk.documentName,
        pageNumber: item.chunk.pageNumber,
        sectionTitle: item.chunk.sectionTitle,
        snippet: item.chunk.text.slice(0, 280) + (item.chunk.text.length > 280 ? '...' : ''),
        similarityScore: item.score,
      };

      return {
        chunk: item.chunk,
        similarityScore: item.score,
        rank: index + 1,
        sourceReference: sourceRef,
      };
    });
  },
};
