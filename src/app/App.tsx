import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { SessionWorkspace } from '../features/sessions/SessionWorkspace';
import { SourcePreviewModal } from '../features/sources/SourcePreviewModal';
import { useSessions } from '../features/sessions/useSessions';
import { useDocumentUpload } from '../features/documents/useDocumentUpload';
import { useHardware } from '../ai/models/useHardware';
import type { SourceReference } from '../features/sessions/types';

export const App: React.FC = () => {
  const {
    sessions,
    activeSession,
    activeSessionId,
    activeDocument,
    messages,
    isGenerating,
    createNewSession,
    deleteSession,
    renameSession,
    setActiveSessionId,
    sendMessage,
    stopGeneration,
    clearMessages,
    removeDocument,
    setDocument,
    refreshSessions,
  } = useSessions();

  const { capability } = useHardware();
  const {
    isParsing,
    parsingProgress,
    errorMessage: parsingError,
    parsedPages,
    documentChunks,
    uploadAndParse,
    attachSampleDocument,
    loadChunksForSession,
    setDocumentChunks,
  } = useDocumentUpload();

  const [selectedSource, setSelectedSource] = useState<SourceReference | null>(null);

  // Whenever activeSessionId changes, load its chunks from IndexedDB
  useEffect(() => {
    if (activeSessionId) {
      loadChunksForSession(activeSessionId);
    } else {
      setDocumentChunks([]);
    }
  }, [activeSessionId, loadChunksForSession, setDocumentChunks]);

  const handleFileSelect = async (file: File) => {
    if (!activeSessionId) return;
    const res = await uploadAndParse(file, activeSessionId);
    if (res) {
      setDocument(res.document);
    }
  };

  const handleAttachSample = async () => {
    if (!activeSessionId) return;
    const res = await attachSampleDocument(activeSessionId);
    if (res) {
      setDocument(res.document);
    }
  };

  const handleRemoveDoc = async () => {
    await removeDocument();
    setDocumentChunks([]);
  };

  return (
    <Layout
      sessions={sessions}
      activeSession={activeSession}
      activeSessionId={activeSessionId}
      activeDocument={activeDocument}
      capability={capability}
      onSelectSession={setActiveSessionId}
      onNewSession={() => createNewSession()}
      onDeleteSession={deleteSession}
      onRenameSession={renameSession}
      onDataChanged={() => refreshSessions()}
    >
      <SessionWorkspace
        session={activeSession}
        document={activeDocument}
        messages={messages}
        capability={capability}
        isGenerating={isGenerating}
        isParsing={isParsing}
        parsingProgress={parsingProgress}
        parsingError={parsingError}
        parsedPages={parsedPages}
        documentChunks={documentChunks}
        onOpenHardwareModal={() => {
          const btn = document.querySelector('button[title*="hardware"]') as HTMLButtonElement | null;
          if (btn) btn.click();
        }}
        onFileSelect={handleFileSelect}
        onAttachSample={handleAttachSample}
        onRemoveDocument={handleRemoveDoc}
        onSendMessage={sendMessage}
        onStopGeneration={stopGeneration}
        onClearChat={clearMessages}
        onSelectSource={(src) => setSelectedSource(src)}
      />

      <SourcePreviewModal
        source={selectedSource}
        onClose={() => setSelectedSource(null)}
      />
    </Layout>
  );
};

export default App;
