import { useState, useEffect } from 'react';
import { embeddingService } from './embeddingService';
import type { ModelDownloadProgress } from './types';

export function useEmbedding() {
  const [isReady, setIsReady] = useState(embeddingService.status.isReady);
  const [isInitializing, setIsInitializing] = useState(embeddingService.status.isInitializing);
  const [downloadProgress, setDownloadProgress] = useState<ModelDownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = embeddingService.onProgress((progress) => {
      setDownloadProgress(progress);
    });

    return () => {
      unsub();
    };
  }, []);

  const prewarmModel = async () => {
    try {
      setIsInitializing(true);
      setError(null);
      await embeddingService.initModel();
      setIsReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize embedding model');
    } finally {
      setIsInitializing(false);
    }
  };

  return {
    isReady,
    isInitializing,
    downloadProgress,
    error,
    prewarmModel,
    embedQuery: (text: string) => embeddingService.embedQuery(text),
    embedChunks: (texts: string[]) => embeddingService.embedChunks(texts),
  };
}
