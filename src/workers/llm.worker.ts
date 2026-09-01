import { pipeline, env, TextStreamer, type TextGenerationPipeline } from '@huggingface/transformers';
import type {
  LLMWorkerIncomingMessage,
  LLMWorkerOutgoingMessage,
  GenerationMetrics,
} from '../ai/inference/types';

// Configure Transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

const DEFAULT_MODEL = 'onnx-community/Qwen2.5-0.5B-Instruct';
let generatorInstance: TextGenerationPipeline | null = null;
let currentModelId = '';
let currentDevice = 'webgpu';
let isAborted = false;

/**
 * Runs a 1-token warmup pass to pre-compile WebGPU shaders and initialize compute pipelines.
 */
async function warmupShaders(generator: TextGenerationPipeline): Promise<void> {
  try {
    const warmupPrompt = '<|im_start|>user\nhi<|im_end|>\n<|im_start|>assistant\n';
    await generator(warmupPrompt, { max_new_tokens: 1, temperature: 0.1 });
  } catch (err) {
    console.warn('Shader warmup pass non-fatal notice:', err);
  }
}

/**
 * Loads the Qwen text generation pipeline with WebGPU acceleration, automatic shader warmup, and WASM fallback.
 */
async function loadGenerator(
  modelId: string = DEFAULT_MODEL,
  preferredDevice: 'webgpu' | 'wasm' = 'webgpu'
): Promise<{ generator: TextGenerationPipeline; device: string }> {
  if (generatorInstance && currentModelId === modelId) {
    return { generator: generatorInstance, device: currentDevice };
  }

  currentModelId = modelId;

  const progressCallback = (progress: any) => {
    const msg: LLMWorkerOutgoingMessage = {
      type: 'MODEL_PROGRESS',
      data: {
        status: progress.status,
        progress: progress.progress,
        loaded: progress.loaded,
        total: progress.total,
        file: progress.file,
        name: progress.name,
      },
    };
    self.postMessage(msg);
  };

  try {
    // Try WebGPU first if requested
    if (preferredDevice === 'webgpu' && navigator.gpu) {
      currentDevice = 'webgpu';
      generatorInstance = await pipeline('text-generation', modelId, {
        dtype: 'q4',
        device: 'webgpu',
        progress_callback: progressCallback,
      });

      // Warmup WebGPU WGSL compute shaders
      await warmupShaders(generatorInstance);
      return { generator: generatorInstance, device: 'webgpu' };
    }
  } catch (gpuError) {
    console.warn('WebGPU text generation pipeline failed, falling back to WASM SIMD:', gpuError);
  }

  // Fallback to WASM
  currentDevice = 'wasm';
  generatorInstance = await pipeline('text-generation', modelId, {
    dtype: 'q4',
    device: 'wasm',
    progress_callback: progressCallback,
  });

  await warmupShaders(generatorInstance);
  return { generator: generatorInstance, device: 'wasm' };
}

self.onmessage = async (event: MessageEvent<LLMWorkerIncomingMessage>) => {
  const message = event.data;

  try {
    switch (message.type) {
      case 'LOAD_MODEL': {
        const { device } = await loadGenerator(message.modelId, message.device || 'webgpu');
        const response: LLMWorkerOutgoingMessage = {
          type: 'MODEL_LOADED',
          modelId: currentModelId,
          device,
        };
        self.postMessage(response);
        break;
      }

      case 'GENERATE': {
        isAborted = false;
        const { generator, device } = await loadGenerator();

        let generatedTextAccumulator = '';
        let tokenCount = 0;
        let firstTokenTime = 0;
        const startTime = performance.now();

        const streamer = new TextStreamer(generator.tokenizer, {
          skip_prompt: true,
          skip_special_tokens: true,
          callback_function: (tokenText: string) => {
            if (isAborted) return;

            if (tokenCount === 0) {
              firstTokenTime = performance.now();
            }
            tokenCount++;
            generatedTextAccumulator += tokenText;

            const streamMsg: LLMWorkerOutgoingMessage = {
              type: 'TOKEN_STREAM',
              token: tokenText,
              requestId: message.requestId,
            };
            self.postMessage(streamMsg);
          },
        });

        await generator(message.prompt, {
          max_new_tokens: message.config?.maxNewTokens || 512,
          temperature: message.config?.temperature || 0.2,
          top_p: message.config?.topP || 0.9,
          repetition_penalty: message.config?.repetitionPenalty || 1.1,
          streamer,
        });

        const endTime = performance.now();
        const totalDurationMs = Math.round(endTime - startTime);
        const ttftMs = Math.round((firstTokenTime || endTime) - startTime);
        const genDurationSec = (endTime - (firstTokenTime || startTime)) / 1000;
        const tokensPerSec =
          genDurationSec > 0 && tokenCount > 0
            ? Number((tokenCount / genDurationSec).toFixed(1))
            : Number(((tokenCount / (totalDurationMs / 1000))).toFixed(1));

        const metrics: GenerationMetrics = {
          ttftMs,
          tokensPerSecond: Math.max(1.0, tokensPerSec || 0),
          totalTokens: tokenCount,
          durationMs: totalDurationMs,
          device,
        };

        if (isAborted) {
          self.postMessage({
            type: 'GENERATION_ABORTED',
            partialText: generatedTextAccumulator,
            requestId: message.requestId,
            metrics,
          } as LLMWorkerOutgoingMessage);
        } else {
          const completeMsg: LLMWorkerOutgoingMessage = {
            type: 'GENERATION_COMPLETE',
            fullText: generatedTextAccumulator.trim(),
            requestId: message.requestId,
            metrics,
          };
          self.postMessage(completeMsg);
        }
        break;
      }

      case 'RUN_BENCHMARK': {
        const { generator, device } = await loadGenerator();
        const benchmarkPrompt =
          '<|im_start|>user\nExplain in 50 words the concept of client-side artificial intelligence and WebGPU acceleration.<|im_end|>\n<|im_start|>assistant\n';

        let tokenCount = 0;
        let firstTokenTime = 0;
        const startTime = performance.now();

        const streamer = new TextStreamer(generator.tokenizer, {
          skip_prompt: true,
          skip_special_tokens: true,
          callback_function: () => {
            if (tokenCount === 0) {
              firstTokenTime = performance.now();
            }
            tokenCount++;
          },
        });

        await generator(benchmarkPrompt, {
          max_new_tokens: 64,
          temperature: 0.1,
          streamer,
        });

        const endTime = performance.now();
        const totalDurationMs = Math.round(endTime - startTime);
        const ttftMs = Math.round((firstTokenTime || endTime) - startTime);
        const genDurationSec = (endTime - (firstTokenTime || startTime)) / 1000;
        const tokensPerSec = Number((tokenCount / Math.max(0.001, genDurationSec)).toFixed(1));

        const metrics: GenerationMetrics = {
          ttftMs,
          tokensPerSecond: tokensPerSec,
          totalTokens: tokenCount,
          durationMs: totalDurationMs,
          device,
        };

        self.postMessage({
          type: 'BENCHMARK_COMPLETE',
          metrics,
          requestId: message.requestId,
        } as LLMWorkerOutgoingMessage);
        break;
      }

      case 'ABORT_GENERATION': {
        isAborted = true;
        break;
      }

      default:
        break;
    }
  } catch (error) {
    const errorMsg: LLMWorkerOutgoingMessage = {
      type: 'ERROR',
      error: error instanceof Error ? error.message : String(error),
      requestId: (message as any).requestId,
    };
    self.postMessage(errorMsg);
  }
};
