import { GROUNDED_SYSTEM_PROMPT } from './systemPrompts';
import { sanitizeForPrompt } from '../../utils/security';
import type { RetrievedChunk } from '../retrieval/types';

/**
 * Formats retrieved chunks into standardized numbered context blocks with prompt injection sanitization.
 */
export function formatDocumentContext(retrievedChunks: RetrievedChunk[]): string {
  if (retrievedChunks.length === 0) {
    return 'No relevant document context found.';
  }

  return retrievedChunks
    .map((item, index) => {
      const pageInfo = item.chunk.pageNumber ? `Page ${item.chunk.pageNumber}` : 'General';
      const sectionInfo = item.chunk.sectionTitle ? ` - ${item.chunk.sectionTitle}` : '';
      const docName = sanitizeForPrompt(item.chunk.documentName || 'Document');
      const sanitizedText = sanitizeForPrompt(item.chunk.text.trim());

      return `[Source ${index + 1}: ${docName} (${pageInfo}${sectionInfo})]\n${sanitizedText}`;
    })
    .join('\n\n');
}

/**
 * Builds a complete ChatML prompt for Qwen 2.5 with grounded context, conversation history, prompt injection defense, and strict anti-hallucination guardrails.
 */
export function buildGroundedPrompt(
  userQuery: string,
  retrievedChunks: RetrievedChunk[],
  customSystemPrompt: string = GROUNDED_SYSTEM_PROMPT,
  conversationHistory?: { role: 'user' | 'assistant' | 'system'; content: string }[]
): string {
  const contextText = formatDocumentContext(retrievedChunks);
  const sanitizedQuery = sanitizeForPrompt(userQuery.trim());

  let historyBlock = '';
  if (conversationHistory && conversationHistory.length > 0) {
    // Filter out streaming or empty placeholder messages and take the last 6 turns (3 exchanges)
    const validHistory = conversationHistory
      .filter((m) => m.content && m.content.trim().length > 0 && m.role !== 'system')
      .slice(-6);

    for (const msg of validHistory) {
      const cleanRole = msg.role === 'assistant' ? 'assistant' : 'user';
      const sanitizedContent = sanitizeForPrompt(msg.content.trim());
      historyBlock += `<|im_start|>${cleanRole}\n${sanitizedContent}<|im_end|>\n`;
    }
  }

  return `<|im_start|>system
${customSystemPrompt}

--- DOCUMENT CONTEXT ---
${contextText}
------------------------<|im_end|>
${historyBlock}<|im_start|>user
${sanitizedQuery}<|im_end|>
<|im_start|>assistant
`;
}
