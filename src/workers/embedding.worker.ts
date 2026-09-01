import { pipeline, env, type FeatureExtractionPipeline } from '@huggingface/transformers';
import type { EmbeddingWorkerIncomingMessage, EmbeddingWorkerOutgoingMessage } from '../ai/embeddings/types';

// Configure Transformers.js for browser environment
env.allowLocalModels = false;
env.useBrowserCache = true;

const DEFAULT_MODEL = 'Xenova/bge-small-en-v1.5';
let extractorInstance: FeatureExtractionPipeline | null = null;
let currentModelId = DEFAULT_MODEL;

/**
 * Initializes or returns the cached embedding pipeline.
 */
async function getExtractor(modelId: string = DEFAULT_MODEL): Promise<FeatureExtractionPipeline> {
  if (extractorInstance && currentModelId === modelId) {
    return extractorInstance;
  }

  currentModelId = modelId;
  extractorInstance = await pipeline('feature-extraction', modelId, {
    progress_callback: (progress: any) => {
      const msg: EmbeddingWorkerOutgoingMessage = {
        type: 'MODEL_PROGRESS',
        data: {
          status: progress.status,
          file: progress.file,
          progress: progress.progress,
          loaded: progress.loaded,
          total: progress.total,
          name: progress.name,
        },
      };
      self.postMessage(msg);
    },
  });

  return extractorInstance;
}

self.onmessage = async (event: MessageEvent<EmbeddingWorkerIncomingMessage>) => {
  const message = event.data;

  try {
    switch (message.type) {
      case 'INIT_MODEL': {
        const model = await getExtractor(message.modelId);
        // Run a dummy pass to warm up weights and measure dimensions
        const warmup = await model('warmup query', { pooling: 'mean', normalize: true });
        const dimensions = warmup.dims[warmup.dims.length - 1] || 384;

        const response: EmbeddingWorkerOutgoingMessage = {
          type: 'MODEL_READY',
          modelId: currentModelId,
          dimensions,
        };
        self.postMessage(response);
        break;
      }

      case 'EMBED_CHUNKS': {
        const model = await getExtractor();
        const results: number[][] = [];

        for (let i = 0; i < message.texts.length; i++) {
          const text = message.texts[i];
          const output = await model(text, { pooling: 'mean', normalize: true });
          results.push(Array.from(output.data as Float32Array));

          // Post progress every 5 chunks
          if (i % 5 === 0 || i === message.texts.length - 1) {
            self.postMessage({
              type: 'MODEL_PROGRESS',
              data: {
                status: 'progress',
                progress: Math.round(((i + 1) / message.texts.length) * 100),
                loaded: i + 1,
                total: message.texts.length,
                name: 'Embedding document chunks...',
              },
            });
          }
        }

        const response: EmbeddingWorkerOutgoingMessage = {
          type: 'EMBED_CHUNKS_SUCCESS',
          embeddings: results,
          requestId: message.requestId,
        };
        self.postMessage(response);
        break;
      }

      case 'EMBED_QUERY': {
        const model = await getExtractor();
        const output = await model(message.text, { pooling: 'mean', normalize: true });
        const vector = Array.from(output.data as Float32Array);

        const response: EmbeddingWorkerOutgoingMessage = {
          type: 'EMBED_QUERY_SUCCESS',
          embedding: vector,
          requestId: message.requestId,
        };
        self.postMessage(response);
        break;
      }

      default:
        break;
    }
  } catch (error) {
    const errorMsg: EmbeddingWorkerOutgoingMessage = {
      type: 'ERROR',
      error: error instanceof Error ? error.message : String(error),
      requestId: (message as any).requestId,
    };
    self.postMessage(errorMsg);
  }
};
