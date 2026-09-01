import { useState, useEffect, useCallback } from 'react';
import type { Session, DocumentRecord, ChatMessage } from './types';
import {
  sessionRepository,
  documentRepository,
  messageRepository,
} from '../../storage';
import { ragCoordinator } from '../../ai/rag';

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeDocument, setActiveDocument] = useState<DocumentRecord | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [currentRAGStatus, setCurrentRAGStatus] = useState<string>('');

  const refreshSessions = useCallback(async (preferredActiveId?: string) => {
    try {
      const allSessions = await sessionRepository.getAll();
      setSessions(allSessions);

      if (allSessions.length === 0) {
        const initial = await sessionRepository.create('Document Workspace 1');
        setSessions([initial]);
        setActiveSessionId(initial.id);
      } else {
        const targetId = preferredActiveId || activeSessionId;
        const exists = allSessions.some((s) => s.id === targetId);
        if (exists && targetId) {
          setActiveSessionId(targetId);
        } else {
          setActiveSessionId(allSessions[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load sessions from IndexedDB:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeSessionId]);

  useEffect(() => {
    refreshSessions();
  }, []);

  useEffect(() => {
    let isCurrent = true;
    async function loadSessionData() {
      if (!activeSessionId) {
        setActiveDocument(null);
        setMessages([]);
        return;
      }

      try {
        const [doc, msgs] = await Promise.all([
          documentRepository.getBySessionId(activeSessionId),
          messageRepository.getBySessionId(activeSessionId),
        ]);

        if (isCurrent) {
          setActiveDocument(doc || null);
          setMessages(msgs);
        }
      } catch (err) {
        console.error('Failed to load session data:', err);
      }
    }

    loadSessionData();
    return () => {
      isCurrent = false;
    };
  }, [activeSessionId]);

  const createNewSession = async (title?: string) => {
    const defaultTitle = `Document Workspace ${sessions.length + 1}`;
    const newSession = await sessionRepository.create(title || defaultTitle);
    await refreshSessions(newSession.id);
    return newSession;
  };

  const deleteSession = async (id: string) => {
    await sessionRepository.deleteWithCascade(id);
    await refreshSessions();
  };

  const renameSession = async (id: string, newTitle: string) => {
    await sessionRepository.updateTitle(id, newTitle);
    await refreshSessions(activeSessionId || undefined);
  };

  const sendMessage = async (content: string) => {
    if (!activeSessionId || isGenerating) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sessionId: activeSessionId,
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    // Snapshot current conversation history before adding new user turn
    const historySnapshot = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    await messageRepository.add(userMessage);
    setMessages((prev) => [...prev, userMessage]);

    const assistantMessageId = crypto.randomUUID();
    let accumulatedTokens = '';

    const initialAssistantMessage: ChatMessage = {
      id: assistantMessageId,
      sessionId: activeSessionId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
      sources: [],
    };

    setMessages((prev) => [...prev, initialAssistantMessage]);

    try {
      setIsGenerating(true);

      const response = await ragCoordinator.execute(
        content,
        activeSessionId,
        (token) => {
          accumulatedTokens += token;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: accumulatedTokens }
                : msg
            )
          );
        },
        (_stage, statusText) => {
          if (statusText) setCurrentRAGStatus(statusText);
        },
        {
          conversationHistory: historySnapshot,
        }
      );

      const finalAssistantMessage: ChatMessage = {
        id: assistantMessageId,
        sessionId: activeSessionId,
        role: 'assistant',
        content: response.fullText,
        timestamp: Date.now(),
        isStreaming: false,
        sources: response.sources,
        metrics: response.metrics,
      };

      setMessages((prev) =>
        prev.map((msg) => (msg.id === assistantMessageId ? finalAssistantMessage : msg))
      );

      await messageRepository.add(finalAssistantMessage);
    } catch (err) {
      console.error('RAG Pipeline execution error:', err);
      const errorMessageText =
        err instanceof Error ? err.message : 'An error occurred during response generation.';

      const errorAssistantMessage: ChatMessage = {
        id: assistantMessageId,
        sessionId: activeSessionId,
        role: 'assistant',
        content: `⚠️ Generation failed: ${errorMessageText}. Please try again.`,
        timestamp: Date.now(),
        isStreaming: false,
        sources: [],
      };

      setMessages((prev) =>
        prev.map((msg) => (msg.id === assistantMessageId ? errorAssistantMessage : msg))
      );

      await messageRepository.add(errorAssistantMessage);
    } finally {
      setIsGenerating(false);
      setCurrentRAGStatus('');
    }
  };

  const stopGeneration = () => {
    ragCoordinator.abort();
    setIsGenerating(false);
  };

  const clearMessages = async () => {
    if (!activeSessionId) return;
    await messageRepository.clearSession(activeSessionId);
    setMessages([]);
  };

  const removeDocument = async () => {
    if (!activeSessionId) return;
    await documentRepository.deleteBySessionId(activeSessionId);
    setActiveDocument(null);
  };

  const setDocument = (doc: DocumentRecord | null) => {
    setActiveDocument(doc);
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  return {
    sessions,
    activeSession,
    activeSessionId,
    activeDocument,
    messages,
    isLoading,
    isGenerating,
    currentRAGStatus,
    setActiveSessionId,
    createNewSession,
    deleteSession,
    renameSession,
    sendMessage,
    stopGeneration,
    clearMessages,
    removeDocument,
    setDocument,
    refreshSessions,
  };
}
