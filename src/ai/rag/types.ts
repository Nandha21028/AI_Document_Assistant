import type { SourceReference } from '../../features/sessions/types';
import type { GenerationConfig, GenerationMetrics } from '../inference/types';

export type RAGStage =
  | 'idle'
  | 'retrieving'
  | 'building_context'
  | 'generating'
  | 'completed'
  | 'not_found'
  | 'error';

export interface RAGPipelineOptions {
  topK?: number;
  minSimilarityScore?: number;
  customSystemPrompt?: string;
  generationConfig?: GenerationConfig;
  conversationHistory?: { role: 'user' | 'assistant' | 'system'; content: string }[];
}

export interface RAGResponse {
  fullText: string;
  sources: SourceReference[];
  stage: RAGStage;
  isGrounded: boolean;
  metrics?: GenerationMetrics;
}

export type RAGTokenCallback = (token: string) => void;
export type RAGStageCallback = (stage: RAGStage, statusText?: string) => void;
