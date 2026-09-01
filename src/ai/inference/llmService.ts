import type {
  LLMWorkerIncomingMessage,
  LLMWorkerOutgoingMessage,
  GenerationConfig,
  GenerationMetrics,
} from './types';

class LLMService {
  private worker: Worker | null = null;
  private isLoaded = false;
  private isLoading = false;
  private currentModelId = 'onnx-community/Qwen2.5-0.5B-Instruct';
  private activeDevice = 'webgpu';
  private activeRequestId: string | null = null;

  private pendingGenerations = new Map<
    string,
    {
      onToken?: (token: string) => void;
      resolve: (data: { fullText: string; metrics?: GenerationMetrics }) => void;
      reject: (err: Error) => void;
    }
  >();

  private progressListeners = new Set<(progress: any) => void>();

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(
        new URL('../../workers/llm.worker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (event: MessageEvent<LLMWorkerOutgoingMessage>) => {
        this.handleWorkerMessage(event.data);
      };

      this.worker.onerror = (err) => {
        console.error('LLM Worker error:', err);
      };
    }
    return this.worker;
  }

  private handleWorkerMessage(message: LLMWorkerOutgoingMessage) {
    switch (message.type) {
      case 'MODEL_PROGRESS':
        this.progressListeners.forEach((listener) => listener(message.data));
        break;

      case 'MODEL_LOADED':
        this.isLoaded = true;
        this.isLoading = false;
        this.currentModelId = message.modelId;
        this.activeDevice = message.device;
        break;

      case 'TOKEN_STREAM': {
        const handler = this.pendingGenerations.get(message.requestId);
        if (handler?.onToken) {
          handler.onToken(message.token);
        }
        break;
      }

      case 'GENERATION_COMPLETE': {
        const handler = this.pendingGenerations.get(message.requestId);
        if (handler) {
          handler.resolve({ fullText: message.fullText, metrics: message.metrics });
          this.pendingGenerations.delete(message.requestId);
          this.activeRequestId = null;
        }
        break;
      }

      case 'GENERATION_ABORTED': {
        const handler = this.pendingGenerations.get(message.requestId);
        if (handler) {
          handler.resolve({ partialText: message.partialText, metrics: message.metrics } as any);
          this.pendingGenerations.delete(message.requestId);
          this.activeRequestId = null;
        }
        break;
      }

      case 'BENCHMARK_COMPLETE': {
        const handler = this.pendingGenerations.get(message.requestId);
        if (handler) {
          handler.resolve({ fullText: '', metrics: message.metrics });
          this.pendingGenerations.delete(message.requestId);
          this.activeRequestId = null;
        }
        break;
      }

      case 'ERROR': {
        if (message.requestId && this.pendingGenerations.has(message.requestId)) {
          const handler = this.pendingGenerations.get(message.requestId);
          handler?.reject(new Error(message.error));
          this.pendingGenerations.delete(message.requestId);
          this.activeRequestId = null;
        } else {
          console.error('LLM Worker returned error:', message.error);
        }
        break;
      }
    }
  }

  /**
   * Loads or prewarms the Qwen model in the background worker.
   */
  async loadModel(
    modelId: string = this.currentModelId,
    device: 'webgpu' | 'wasm' = 'webgpu'
  ): Promise<{ modelId: string; device: string }> {
    if (this.isLoaded && this.currentModelId === modelId) {
      return { modelId: this.currentModelId, device: this.activeDevice };
    }

    this.isLoading = true;
    const worker = this.getWorker();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (!this.isLoaded) {
          this.isLoading = false;
          reject(new Error('LLM model loading timed out.'));
        }
      }, 180000); // 3-minute allowance for initial weight download

      const onMessage = (e: MessageEvent<LLMWorkerOutgoingMessage>) => {
        if (e.data.type === 'MODEL_LOADED') {
          clearTimeout(timeout);
          worker.removeEventListener('message', onMessage);
          resolve({ modelId: e.data.modelId, device: e.data.device });
        } else if (e.data.type === 'ERROR' && !e.data.requestId) {
          clearTimeout(timeout);
          worker.removeEventListener('message', onMessage);
          reject(new Error(e.data.error));
        }
      };

      worker.addEventListener('message', onMessage);

      const loadMsg: LLMWorkerIncomingMessage = {
        type: 'LOAD_MODEL',
        modelId,
        device,
      };
      worker.postMessage(loadMsg);
    });
  }

  /**
   * Generates a streaming text completion from Qwen with performance metrics.
   */
  async generateStream(
    prompt: string,
    onToken?: (token: string) => void,
    config?: GenerationConfig
  ): Promise<{ fullText: string; metrics?: GenerationMetrics }> {
    const worker = this.getWorker();
    const requestId = crypto.randomUUID();
    this.activeRequestId = requestId;

    return new Promise((resolve, reject) => {
      this.pendingGenerations.set(requestId, {
        onToken,
        resolve,
        reject,
      });

      const genMsg: LLMWorkerIncomingMessage = {
        type: 'GENERATE',
        prompt,
        config,
        requestId,
      };
      worker.postMessage(genMsg);
    });
  }

  /**
   * Runs an isolated GPU performance benchmark measuring tokens/second and TTFT.
   */
  async runBenchmark(): Promise<GenerationMetrics> {
    const worker = this.getWorker();
    const requestId = crypto.randomUUID();
    this.activeRequestId = requestId;

    return new Promise((resolve, reject) => {
      this.pendingGenerations.set(requestId, {
        resolve: (data) => {
          if (data.metrics) {
            resolve(data.metrics);
          } else {
            reject(new Error('Benchmark did not return metrics.'));
          }
        },
        reject,
      });

      const benchMsg: LLMWorkerIncomingMessage = {
        type: 'RUN_BENCHMARK',
        requestId,
      };
      worker.postMessage(benchMsg);
    });
  }

  /**
   * Aborts active text generation.
   */
  abort() {
    if (this.activeRequestId && this.worker) {
      this.worker.postMessage({
        type: 'ABORT_GENERATION',
        requestId: this.activeRequestId,
      });
      this.activeRequestId = null;
    }
  }

  onProgress(callback: (progress: any) => void): () => void {
    this.progressListeners.add(callback);
    return () => this.progressListeners.delete(callback);
  }

  get status() {
    return {
      isLoaded: this.isLoaded,
      isLoading: this.isLoading,
      currentModelId: this.currentModelId,
      activeDevice: this.activeDevice,
    };
  }
}

export const llmService = new LLMService();
