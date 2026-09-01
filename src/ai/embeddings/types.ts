export interface ModelDownloadProgress {
  status: 'initiate' | 'download' | 'progress' | 'done' | 'ready';
  file?: string;
  progress?: number;
  loaded?: number;
  total?: number;
  name?: string;
}

export type EmbeddingWorkerIncomingMessage =
  | { type: 'INIT_MODEL'; modelId?: string }
  | { type: 'EMBED_CHUNKS'; texts: string[]; requestId: string }
  | { type: 'EMBED_QUERY'; text: string; requestId: string };

export type EmbeddingWorkerOutgoingMessage =
  | { type: 'MODEL_PROGRESS'; data: ModelDownloadProgress }
  | { type: 'MODEL_READY'; modelId: string; dimensions: number }
  | { type: 'EMBED_CHUNKS_SUCCESS'; embeddings: number[][]; requestId: string }
  | { type: 'EMBED_QUERY_SUCCESS'; embedding: number[]; requestId: string }
  | { type: 'ERROR'; error: string; requestId?: string };

export interface EmbeddingProgressCallback {
  (progress: { current: number; total: number; percentage: number; status: string }): void;
}
