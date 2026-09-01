import { retriever } from '../retrieval';
import { llmService } from '../inference';
import { buildGroundedPrompt } from '../prompts';
import type {
  RAGPipelineOptions,
  RAGResponse,
  RAGTokenCallback,
  RAGStageCallback,
} from './types';

export const ragCoordinator = {
  /**
   * Executes the full grounded RAG pipeline from query to retrieval to LLM generation.
   */
  async execute(
    query: string,
    sessionId: string,
    onToken?: RAGTokenCallback,
    onStage?: RAGStageCallback,
    options: RAGPipelineOptions = {}
  ): Promise<RAGResponse> {
    const {
      topK = 3,
      minSimilarityScore = 0.28,
      customSystemPrompt,
      generationConfig = { maxNewTokens: 512, temperature: 0.2, topP: 0.9 },
    } = options;

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      throw new Error('Query cannot be empty.');
    }

    try {
      // 1. Stage: Context-Aware Query Expansion for Follow-up Questions
      let effectiveSearchQuery = trimmedQuery;
      if (options.conversationHistory && options.conversationHistory.length > 0) {
        const lastUserMsg = [...options.conversationHistory].reverse().find((m) => m.role === 'user');
        if (
          lastUserMsg &&
          /\b(it|they|them|he|she|that|this|the author|the book|the order|why|who|when|how much|and)\b/i.test(trimmedQuery)
        ) {
          effectiveSearchQuery = `${trimmedQuery} ${lastUserMsg.content}`;
        }
      }

      onStage?.('retrieving', 'Searching document vectors for relevant sections...');
      const retrievedChunks = await retriever.retrieve(effectiveSearchQuery, sessionId, {
        topK,
        minSimilarityScore,
      });

      // 2. Short-Circuit if no context is found
      if (retrievedChunks.length === 0) {
        onStage?.('not_found', 'No relevant document context found.');
        const notFoundMessage =
          'The uploaded document does not contain sufficient facts to answer this question. Under strict grounding rules, I only answer using facts verified in the document.';

        return {
          fullText: notFoundMessage,
          sources: [],
          stage: 'not_found',
          isGrounded: false,
        };
      }

      // 3. Stage: Building Context Prompt with Multi-Turn History
      onStage?.('building_context', `Found ${retrievedChunks.length} relevant sections. Building grounded prompt...`);
      const prompt = buildGroundedPrompt(
        trimmedQuery,
        retrievedChunks,
        customSystemPrompt,
        options.conversationHistory
      );

      // 4. Stage: Generating with Local Qwen LLM
      onStage?.('generating', 'Generating answer using local Qwen WebGPU model...');
      const sources = retrievedChunks.map((r) => r.sourceReference);

      let fullGeneratedText = '';
      const genResult = await llmService.generateStream(
        prompt,
        (token) => {
          fullGeneratedText += token;
          onToken?.(token);
        },
        generationConfig
      );

      const finalOutput = genResult.fullText || fullGeneratedText;

      onStage?.('completed', 'Answer generation complete.');
      return {
        fullText: finalOutput.trim(),
        sources,
        stage: 'completed',
        isGrounded: true,
        metrics: genResult.metrics,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      onStage?.('error', `RAG Execution failed: ${errorMsg}`);
      throw error;
    }
  },

  /**
   * Aborts ongoing RAG generation.
   */
  abort() {
    llmService.abort();
  },
};
