import React from 'react';
import { Lock, Cpu, Layers } from 'lucide-react';
import { ChatContainer } from '../chat/ChatContainer';
import { ChatInput } from '../chat/ChatInput';
import { DocumentDropzone } from '../documents/DocumentDropzone';
import { DocumentCard } from '../documents/DocumentCard';
import type { Session, DocumentRecord, DocumentChunk, ChatMessage, SourceReference } from './types';
import type { HardwareCapability } from '../../ai/models/types';
import type { ParsedPage } from '../../documents/parsers/types';

interface SessionWorkspaceProps {
  session: Session | null;
  document: DocumentRecord | null;
  messages: ChatMessage[];
  capability: HardwareCapability | null;
  isGenerating?: boolean;
  isParsing: boolean;
  parsingProgress?: { currentPage: number; totalPages: number; status: string } | null;
  parsingError?: string | null;
  parsedPages?: ParsedPage[];
  documentChunks?: DocumentChunk[];
  onOpenHardwareModal: () => void;
  onFileSelect: (file: File) => void;
  onAttachSample: () => void;
  onRemoveDocument: () => void;
  onSendMessage: (text: string) => void;
  onStopGeneration?: () => void;
  onClearChat: () => void;
  onSelectSource?: (source: SourceReference) => void;
}

export const SessionWorkspace: React.FC<SessionWorkspaceProps> = ({
  session,
  document,
  messages,
  capability,
  isGenerating = false,
  isParsing,
  parsingProgress,
  parsingError,
  parsedPages,
  documentChunks = [],
  onOpenHardwareModal,
  onFileSelect,
  onAttachSample,
  onRemoveDocument,
  onSendMessage,
  onStopGeneration,
  onClearChat,
  onSelectSource,
}) => {
  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center text-chat-muted text-base font-bold">
        Select or create a document workspace to begin.
      </div>
    );
  }

  const isOptimal = capability?.readinessStatus === 'optimal';
  const hasDocument = Boolean(document);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-chat-bg">
      {/* If document is attached, show compact document header card */}
      {hasDocument && document && (
        <div className="px-4 py-2.5 bg-chat-sidebar/80 border-b border-chat-border shrink-0 shadow-sm backdrop-blur-sm">
          <DocumentCard
            document={document}
            onRemoveDocument={onRemoveDocument}
            extractedPages={parsedPages}
            chunks={documentChunks}
          />
        </div>
      )}

      {/* Main Area: Upload screen OR Chat screen */}
      {!hasDocument ? (
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col justify-center">
          <div className="max-w-2xl w-full mx-auto my-auto space-y-6 animate-message-entrance py-6">
            {/* Welcome Banner */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black text-chat-text tracking-tight">
                {session.title}
              </h2>
              <p className="text-sm text-chat-muted font-medium max-w-md mx-auto leading-relaxed">
                Client-isolated workspace. Drop your document below to begin grounded semantic extraction.
              </p>
            </div>

            {/* Document Dropzone with Real Parsing */}
            <div className="skeuo-card p-6 md:p-8 shadow-xl space-y-4">
              <DocumentDropzone
                onFileSelect={onFileSelect}
                onAttachSample={onAttachSample}
                isParsing={isParsing}
                parsingProgress={parsingProgress}
                errorMessage={parsingError}
              />
            </div>

            {/* Architecture Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <div className="skeuo-card p-4 space-y-1.5 hover:border-chat-accent transition-all shadow-md">
                <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                  <span className="skeuo-led skeuo-led-green" />
                  <Lock className="w-4 h-4" />
                  <span className="font-extrabold text-chat-text">Client-Side Engine</span>
                </div>
                <p className="text-xs text-chat-muted leading-relaxed font-medium">
                  PDF &amp; text extraction runs in-browser with zero external cloud egress.
                </p>
              </div>

              <div
                onClick={onOpenHardwareModal}
                className="skeuo-card p-4 space-y-1.5 cursor-pointer hover:border-sky-500 transition-all active:scale-[0.99] shadow-md"
              >
                <div className="flex items-center space-x-2 text-sky-600 dark:text-sky-400 text-xs font-bold">
                  <span className={`skeuo-led ${isOptimal ? 'skeuo-led-green' : 'skeuo-led-amber'}`} />
                  <Cpu className="w-4 h-4" />
                  <span className="font-extrabold text-chat-text">{isOptimal ? 'WebGPU Active' : 'WASM Fallback'}</span>
                </div>
                <p className="text-xs text-chat-muted leading-relaxed font-medium">
                  Hardware-accelerated local compute for vector search &amp; Qwen inference.
                </p>
              </div>

              <div className="skeuo-card p-4 space-y-1.5 hover:border-purple-500 transition-all shadow-md">
                <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 text-xs font-bold">
                  <span className="skeuo-led skeuo-led-purple" />
                  <Layers className="w-4 h-4" />
                  <span className="font-extrabold text-chat-text">Page Attribution</span>
                </div>
                <p className="text-xs text-chat-muted leading-relaxed font-medium">
                  Every fact is mapped strictly to exact page numbers &amp; section headings.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Active Document Chat View */
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <ChatContainer
            messages={messages}
            document={document}
            onClearChat={onClearChat}
            onSelectSource={onSelectSource}
          />
        </div>
      )}

      {/* Persistent Chat Input Bar */}
      <ChatInput
        onSendMessage={onSendMessage}
        isDisabled={!hasDocument}
        disabledReason={!hasDocument ? 'Please attach a document above before asking questions' : undefined}
        isGenerating={isGenerating}
        onStopGeneration={onStopGeneration}
      />
    </div>
  );
};
