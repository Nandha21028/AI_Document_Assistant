import type {
  EmbeddingWorkerIncomingMessage,
  EmbeddingWorkerOutgoingMessage,
  ModelDownloadProgress,
  EmbeddingProgressCallback,
} from './types';

class EmbeddingService {
  private worker: Worker | null = null;
  private isReady = false;
  private isInitializing = false;
  private modelId = 'Xenova/bge-small-en-v1.5';
  private dimensions = 384;
  private pendingRequests = new Map<
    string,
    {
      resolve: (data: any) => void;
      reject: (err: Error) => void;
    }
  >();
  private progressListeners = new Set<(progress: ModelDownloadProgress) => void>();

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(
        new URL('../../workers/embedding.worker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (event: MessageEvent<EmbeddingWorkerOutgoingMessage>) => {
        this.handleWorkerMessage(event.data);
      };

      this.worker.onerror = (err) => {
        console.error('Embedding worker error:', err);
      };
    }
    return this.worker;
  }

  private handleWorkerMessage(message: EmbeddingWorkerOutgoingMessage) {
    switch (message.type) {
      case 'MODEL_PROGRESS':
        this.progressListeners.forEach((listener) => listener(message.data));
        break;

      case 'MODEL_READY':
        this.isReady = true;
        this.isInitializing = false;
        this.modelId = message.modelId;
        this.dimensions = message.dimensions;
        break;

      case 'EMBED_CHUNKS_SUCCESS': {
        const handler = this.pendingRequests.get(message.requestId);
        if (handler) {
          handler.resolve(message.embeddings);
          this.pendingRequests.delete(message.requestId);
        }
        break;
      }

      case 'EMBED_QUERY_SUCCESS': {
        const handler = this.pendingRequests.get(message.requestId);
        if (handler) {
          handler.resolve(message.embedding);
          this.pendingRequests.delete(message.requestId);
        }
        break;
      }

      case 'ERROR': {
        if (message.requestId && this.pendingRequests.has(message.requestId)) {
          const handler = this.pendingRequests.get(message.requestId);
          handler?.reject(new Error(message.error));
          this.pendingRequests.delete(message.requestId);
        } else {
          console.error('Embedding Worker returned unhandled error:', message.error);
        }
        break;
      }
    }
  }

  /**
   * Initializes the embedding model in the background worker.
   */
  async initModel(modelId?: string): Promise<{ modelId: string; dimensions: number }> {
    if (this.isReady) {
      return { modelId: this.modelId, dimensions: this.dimensions };
    }

    this.isInitializing = true;
    const worker = this.getWorker();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (!this.isReady) {
          this.isInitializing = false;
          reject(new Error('Embedding model initialization timed out.'));
        }
      }, 120000); // 2 minute download/init allowance

      const checkReady = (e: MessageEvent<EmbeddingWorkerOutgoingMessage>) => {
        if (e.data.type === 'MODEL_READY') {
          clearTimeout(timeout);
          worker.removeEventListener('message', checkReady);
          resolve({ modelId: this.modelId, dimensions: this.dimensions });
        } else if (e.data.type === 'ERROR' && !e.data.requestId) {
          clearTimeout(timeout);
          worker.removeEventListener('message', checkReady);
          reject(new Error(e.data.error));
        }
      };

      worker.addEventListener('message', checkReady);

      const initMsg: EmbeddingWorkerIncomingMessage = {
        type: 'INIT_MODEL',
        modelId,
      };
      worker.postMessage(initMsg);
    });
  }

  /**
   * Computes vector embeddings for a batch of text chunks.
   */
  async embedChunks(
    texts: string[],
    onProgress?: EmbeddingProgressCallback
  ): Promise<number[][]> {
    if (texts.length === 0) return [];

    const worker = this.getWorker();
    const requestId = crypto.randomUUID();

    if (onProgress) {
      const progressUnsub = this.onProgress((p) => {
        if (p.total && p.loaded) {
          onProgress({
            current: p.loaded,
            total: p.total,
            percentage: p.progress || Math.round((p.loaded / p.total) * 100),
            status: p.name || 'Embedding chunks...',
          });
        }
      });

      try {
        const result = await this.sendWorkerRequest<number[][]>(worker, {
          type: 'EMBED_CHUNKS',
          texts,
          requestId,
        }, requestId);
        progressUnsub();
        return result;
      } catch (err) {
        progressUnsub();
        throw err;
      }
    }

    return await this.sendWorkerRequest<number[][]>(worker, {
      type: 'EMBED_CHUNKS',
      texts,
      requestId,
    }, requestId);
  }

  /**
   * Computes vector embedding for a single user query.
   */
  async embedQuery(text: string): Promise<number[]> {
    const worker = this.getWorker();
    const requestId = crypto.randomUUID();

    return await this.sendWorkerRequest<number[]>(worker, {
      type: 'EMBED_QUERY',
      text,
      requestId,
    }, requestId);
  }

  private sendWorkerRequest<T>(
    worker: Worker,
    msg: EmbeddingWorkerIncomingMessage,
    requestId: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      worker.postMessage(msg);
    });
  }

  onProgress(callback: (progress: ModelDownloadProgress) => void): () => void {
    this.progressListeners.add(callback);
    return () => this.progressListeners.delete(callback);
  }

  get status() {
    return {
      isReady: this.isReady,
      isInitializing: this.isInitializing,
      modelId: this.modelId,
      dimensions: this.dimensions,
    };
  }
}

export const embeddingService = new EmbeddingService();
