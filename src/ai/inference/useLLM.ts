import { useState, useEffect } from 'react';
import { llmService } from './llmService';
import type { GenerationConfig, GenerationMetrics } from './types';

export function useLLM() {
  const [isLoaded, setIsLoaded] = useState(llmService.status.isLoaded);
  const [isLoading, setIsLoading] = useState(llmService.status.isLoading);
  const [downloadProgress, setDownloadProgress] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const unsub = llmService.onProgress((progress) => {
      setDownloadProgress(progress);
    });

    return () => {
      unsub();
    };
  }, []);

  const loadModel = async (modelId?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await llmService.loadModel(modelId);
      setIsLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load LLM model.');
    } finally {
      setIsLoading(false);
    }
  };

  const generate = async (
    prompt: string,
    onToken?: (token: string) => void,
    config?: GenerationConfig
  ): Promise<{ fullText: string; metrics?: GenerationMetrics }> => {
    try {
      setIsGenerating(true);
      setError(null);
      return await llmService.generateStream(prompt, onToken, config);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Generation failed.';
      setError(msg);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  const stopGeneration = () => {
    llmService.abort();
    setIsGenerating(false);
  };

  return {
    isLoaded,
    isLoading,
    isGenerating,
    downloadProgress,
    error,
    modelStatus: llmService.status,
    loadModel,
    generate,
    runBenchmark: () => llmService.runBenchmark(),
    stopGeneration,
  };
}
