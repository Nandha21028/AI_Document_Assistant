/**
 * Fast client-side token count estimator.
 * Approximates Byte-Pair Encoding (BPE) tokens (~4 characters per token in English prose,
 * with adjustment for punctuation, code, and whitespace density).
 */
export function estimateTokens(text: string): number {
  if (!text || text.length === 0) return 0;

  // Split by whitespace and punctuation clusters
  const wordsAndPunctuation = text.trim().split(/\s+/);
  let estimatedTokens = 0;

  for (const word of wordsAndPunctuation) {
    if (word.length <= 4) {
      estimatedTokens += 1;
    } else {
      estimatedTokens += Math.ceil(word.length / 3.5);
    }
  }

  return Math.max(1, estimatedTokens);
}
