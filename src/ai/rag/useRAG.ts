import { useState } from 'react';
import { ragCoordinator } from './ragCoordinator';
import type { RAGStage, RAGPipelineOptions, RAGResponse } from './types';

export function useRAG() {
  const [currentStage, setCurrentStage] = useState<RAGStage>('idle');
  const [stageMessage, setStageMessage] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeRAG = async (
    query: string,
    sessionId: string,
    onToken?: (token: string) => void,
    options?: RAGPipelineOptions
  ): Promise<RAGResponse> => {
    try {
      setIsExecuting(true);
      setError(null);
      return await ragCoordinator.execute(
        query,
        sessionId,
        onToken,
        (stage, msg) => {
          setCurrentStage(stage);
          if (msg) setStageMessage(msg);
        },
        options
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'RAG Pipeline failed.';
      setError(msg);
      setCurrentStage('error');
      throw err;
    } finally {
      setIsExecuting(false);
    }
  };

  const stop = () => {
    ragCoordinator.abort();
    setIsExecuting(false);
    setCurrentStage('idle');
  };

  return {
    currentStage,
    stageMessage,
    isExecuting,
    error,
    executeRAG,
    stop,
  };
}
