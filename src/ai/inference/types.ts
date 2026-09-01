export interface GenerationMetrics {
  ttftMs: number;            // Time to First Token in milliseconds
  tokensPerSecond: number;   // Generation throughput (tokens/sec)
  totalTokens: number;       // Number of generated tokens
  durationMs: number;        // Total generation time in milliseconds
  device: string;            // Active compute device ('webgpu' | 'wasm')
}

export interface GenerationConfig {
  maxNewTokens?: number;     // Maximum tokens to generate (default: 512)
  temperature?: number;      // Randomness (default: 0.2 for factual RAG)
  topP?: number;             // Top-p nucleus sampling (default: 0.9)
  repetitionPenalty?: number;// Repetition penalty (default: 1.1)
}

export interface LLMModelInfo {
  id: string;
  name: string;
  parameters: string;
  sizeMB: number;
  quantization: string;
  description: string;
}

export const SUPPORTED_LLM_MODELS: LLMModelInfo[] = [
  {
    id: 'onnx-community/Qwen2.5-0.5B-Instruct',
    name: 'Qwen 2.5 0.5B Instruct',
    parameters: '0.5 Billion',
    sizeMB: 350,
    quantization: 'q4 (4-bit)',
    description: 'Fast, lightweight model optimal for real-time in-browser inference on all devices.',
  },
  {
    id: 'onnx-community/Qwen2.5-1.5B-Instruct',
    name: 'Qwen 2.5 1.5B Instruct',
    parameters: '1.5 Billion',
    sizeMB: 950,
    quantization: 'q4 (4-bit)',
    description: 'Higher reasoning density for complex multi-page document synthesis (requires 2GB+ VRAM).',
  },
];

export type LLMWorkerIncomingMessage =
  | { type: 'LOAD_MODEL'; modelId: string; device?: 'webgpu' | 'wasm' }
  | {
      type: 'GENERATE';
      prompt: string;
      config?: GenerationConfig;
      requestId: string;
    }
  | { type: 'ABORT_GENERATION'; requestId: string }
  | { type: 'RUN_BENCHMARK'; requestId: string };

export type LLMWorkerOutgoingMessage =
  | {
      type: 'MODEL_PROGRESS';
      data: {
        status: string;
        progress?: number;
        loaded?: number;
        total?: number;
        file?: string;
        name?: string;
      };
    }
  | { type: 'MODEL_LOADED'; modelId: string; device: string }
  | { type: 'TOKEN_STREAM'; token: string; requestId: string }
  | {
      type: 'GENERATION_COMPLETE';
      fullText: string;
      requestId: string;
      metrics: GenerationMetrics;
    }
  | {
      type: 'GENERATION_ABORTED';
      partialText: string;
      requestId: string;
      metrics?: GenerationMetrics;
    }
  | {
      type: 'BENCHMARK_COMPLETE';
      metrics: GenerationMetrics;
      requestId: string;
    }
  | { type: 'ERROR'; error: string; requestId?: string };
