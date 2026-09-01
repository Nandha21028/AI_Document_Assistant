import type { ChunkingOptions, RawChunk } from './types';
import { estimateTokens } from '../metadata/tokenEstimator';

const DEFAULT_SEPARATORS = ['\n\n', '\n', '. ', '? ', '! ', ' ', ''];

/**
 * Detects section headings from the start of a text chunk.
 */
function extractSectionHeading(text: string): string | undefined {
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    // Check Dataset Summary Profile
    if (trimmed.startsWith('===')) {
      return trimmed.replace(/^=+\s*|\s*=+$/g, '').trim();
    }
    // Check Dataset Row Chunk Headers
    if (trimmed.startsWith('[Dataset:')) {
      return trimmed.replace(/^\[|\]$/g, '').trim();
    }
    // Check Markdown headers: # Header, ## Header
    if (trimmed.startsWith('#')) {
      return trimmed.replace(/^#+\s*/, '').trim();
    }
    // Check Numbered Sections: 1. Executive Summary, Section 2:
    if (/^(\d+\.|\bSection\s+\d+:?)\s+[A-Z]/i.test(trimmed)) {
      return trimmed.slice(0, 80);
    }
  }
  return undefined;
}

/**
 * Splits text recursively using a hierarchy of separators.
 */
function recursiveSplit(
  text: string,
  separators: string[],
  chunkSize: number,
  chunkOverlap: number
): string[] {
  const finalChunks: string[] = [];
  const separator = separators[0] !== undefined ? separators[0] : '';
  const nextSeparators = separators.slice(1);

  // Split text by current separator
  const splits = separator ? text.split(separator) : Array.from(text);
  const goodSplits: string[] = [];

  for (const s of splits) {
    if (s.length < chunkSize) {
      goodSplits.push(s);
    } else {
      if (goodSplits.length > 0) {
        finalChunks.push(...combineSplits(goodSplits, separator, chunkSize, chunkOverlap));
        goodSplits.length = 0;
      }
      if (nextSeparators.length === 0) {
        finalChunks.push(s);
      } else {
        const otherChunks = recursiveSplit(s, nextSeparators, chunkSize, chunkOverlap);
        finalChunks.push(...otherChunks);
      }
    }
  }

  if (goodSplits.length > 0) {
    finalChunks.push(...combineSplits(goodSplits, separator, chunkSize, chunkOverlap));
  }

  return finalChunks;
}

/**
 * Combines smaller splits into target chunkSize chunks with sliding window overlap.
 */
function combineSplits(
  splits: string[],
  separator: string,
  chunkSize: number,
  chunkOverlap: number
): string[] {
  const docs: string[] = [];
  let currentDoc: string[] = [];
  let totalLength = 0;

  for (const d of splits) {
    const len = d.length + (currentDoc.length > 0 ? separator.length : 0);

    if (totalLength + len > chunkSize && currentDoc.length > 0) {
      const doc = currentDoc.join(separator).trim();
      if (doc) docs.push(doc);

      // Keep overlap from previous chunks
      while (
        totalLength > chunkOverlap ||
        (totalLength + len > chunkSize && totalLength > 0)
      ) {
        const popped = currentDoc.shift();
        if (popped) {
          totalLength -= popped.length + (currentDoc.length > 0 ? separator.length : 0);
        } else {
          break;
        }
      }
    }

    currentDoc.push(d);
    totalLength += len;
  }

  if (currentDoc.length > 0) {
    const doc = currentDoc.join(separator).trim();
    if (doc) docs.push(doc);
  }

  return docs;
}

/**
 * Chunks a single page of text with exact pageNumber and detected section heading.
 */
export function chunkPage(
  pageText: string,
  pageNumber: number,
  options: ChunkingOptions
): RawChunk[] {
  const { chunkSize = 500, chunkOverlap = 80, minChunkSize = 50, separators = DEFAULT_SEPARATORS } = options;

  const trimmedText = pageText.trim();
  if (!trimmedText || trimmedText.length < minChunkSize) {
    if (trimmedText.length > 0) {
      return [
        {
          text: trimmedText,
          pageNumber,
          sectionTitle: extractSectionHeading(trimmedText),
          tokenCount: estimateTokens(trimmedText),
        },
      ];
    }
    return [];
  }

  const rawChunks = recursiveSplit(trimmedText, separators, chunkSize, chunkOverlap);
  let lastKnownSection: string | undefined;

  return rawChunks
    .map((text) => text.trim())
    .filter((text) => text.length >= minChunkSize)
    .map((text) => {
      const detectedSection = extractSectionHeading(text);
      if (detectedSection) {
        lastKnownSection = detectedSection;
      }

      return {
        text,
        pageNumber,
        sectionTitle: detectedSection || lastKnownSection,
        tokenCount: estimateTokens(text),
      };
    });
}
