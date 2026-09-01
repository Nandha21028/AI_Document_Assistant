/**
 * Security and Prompt Injection Defense Utilities
 */

// Special control tokens used by Qwen and other transformer models that must never appear in raw context
const DANGEROUS_CHATML_TOKENS = [
  '<|im_start|>',
  '<|im_end|>',
  '<|endoftext|>',
  '<|extra_0|>',
  '<|extra_1|>',
  '<|extra_2|>',
  '[INST]',
  '[/INST]',
  '<<SYS>>',
  '<</SYS>>',
];

/**
 * Sanitizes text from documents or user prompts to prevent Prompt Injection and ChatML delimiter breakouts.
 */
export function sanitizeForPrompt(input: string): string {
  if (!input) return '';

  let sanitized = input;

  // Strip or escape special LLM control tokens
  for (const token of DANGEROUS_CHATML_TOKENS) {
    if (sanitized.includes(token)) {
      sanitized = sanitized.replaceAll(token, `[FILTERED_TOKEN]`);
    }
  }

  // Remove non-printable control characters (except newlines and tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return sanitized;
}

/**
 * Sanitizes plain text for safe rendering, preventing raw script injection.
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
