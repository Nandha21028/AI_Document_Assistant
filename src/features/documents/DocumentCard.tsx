import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Eye, Trash2, X, Layers, Search } from 'lucide-react';
import type { DocumentRecord, DocumentChunk } from '../sessions/types';
import { ChunkInspectorModal } from './ChunkInspectorModal';
import { SemanticSearchModal } from '../sources/SemanticSearchModal';
import { ConfirmModal } from '../../components/ConfirmModal';

interface DocumentCardProps {
  document: DocumentRecord;
  onRemoveDocument?: () => void;
  extractedPages?: { pageNumber: number; text: string }[];
  chunks?: DocumentChunk[];
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  onRemoveDocument,
  extractedPages,
  chunks = [],
}) => {
  const [isPagesModalOpen, setIsPagesModalOpen] = useState(false);
  const [isChunksModalOpen, setIsChunksModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);

  const formattedSize = (document.size / 1024).toFixed(1) + ' KB';
  const hasEmbeddings = chunks.some((c) => c.embedding && c.embedding.length > 0);

  return (
    <>
      <div className="skeuo-card p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-sm">
        <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
          <div className="p-2 sm:p-2.5 rounded-xl skeuo-btn bg-chat-well text-chat-accent shrink-0 border border-chat-border shadow-inner">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-chat-text truncate max-w-[200px] sm:max-w-md flex items-center space-x-1.5">
              <span>{document.name}</span>
              <span className="skeuo-led skeuo-led-green animate-pulse-glow" />
            </h4>
            <p className="text-[10px] sm:text-[11px] text-chat-muted flex items-center space-x-1.5 sm:space-x-2 mt-0.5 font-mono truncate">
              <span>{formattedSize}</span>
              <span>•</span>
              <span>{document.pageCount} {document.pageCount === 1 ? 'page' : 'pages'}</span>
              {chunks.length > 0 && (
                <>
                  <span>•</span>
                  <span className="text-purple-400 font-bold">{chunks.length} chunks</span>
                </>
              )}
              <span>•</span>
              <span className="text-emerald-500 font-semibold uppercase">{document.status}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0 self-end sm:self-auto overflow-x-auto max-w-full">
          {/* Vector Search Lab Button */}
          {hasEmbeddings && (
            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="skeuo-btn flex items-center space-x-1.5 px-2 sm:px-2.5 py-1.5 text-sky-500 text-xs font-semibold"
              title="Test Vector Retrieval & Similarity Scores"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Search Lab</span>
            </button>
          )}

          {/* Inspect Chunks Button */}
          {chunks.length > 0 && (
            <button
              onClick={() => setIsChunksModalOpen(true)}
              className="skeuo-btn flex items-center space-x-1.5 px-2 sm:px-2.5 py-1.5 text-purple-400 text-xs font-semibold"
              title="Inspect Chunks & Metadata"
            >
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs">Chunks ({chunks.length})</span>
            </button>
          )}

          {/* Inspect Raw Pages Button */}
          {extractedPages && extractedPages.length > 0 && (
            <button
              onClick={() => setIsPagesModalOpen(true)}
              className="skeuo-btn flex items-center space-x-1 px-2 sm:px-2.5 py-1.5 text-chat-muted hover:text-chat-text text-xs font-semibold"
              title="Inspect Extracted Pages"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pages</span>
            </button>
          )}

          {/* Remove Button */}
          {onRemoveDocument && (
            <button
              onClick={() => setIsRemoveConfirmOpen(true)}
              className="skeuo-btn p-1.5 text-chat-muted hover:text-rose-500"
              title="Remove Document"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Raw Page Inspector Modal */}
      {isPagesModalOpen && extractedPages && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="skeuo-card max-w-2xl w-full max-h-[85dvh] flex flex-col shadow-2xl overflow-hidden animate-modal-pop bg-chat-card border border-chat-border">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-chat-border bg-chat-sidebar skeuo-header">
              <div>
                <h3 className="text-sm font-bold text-chat-text flex items-center space-x-2">
                  <span className="truncate max-w-xs sm:max-w-sm">{document.name}</span>
                  <span className="skeuo-pill px-2 py-0.5 text-[10px] text-chat-muted">Raw Extraction</span>
                </h3>
                <p className="text-xs text-chat-muted font-mono mt-0.5">
                  {extractedPages.length} {extractedPages.length === 1 ? 'Page' : 'Pages'} Extracted
                </p>
              </div>
              <button
                onClick={() => setIsPagesModalOpen(false)}
                className="skeuo-btn p-1.5 text-chat-muted hover:text-chat-text"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {extractedPages.map((page) => (
                <div
                  key={page.pageNumber}
                  className="skeuo-well p-3.5 sm:p-4 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs text-chat-accent font-bold">
                    <span className="flex items-center space-x-1.5">
                      <span className="skeuo-led skeuo-led-green" />
                      <span>Page {page.pageNumber}</span>
                    </span>
                    <span className="text-[10px] text-chat-muted font-mono font-normal">
                      {page.text.length} characters
                    </span>
                  </div>
                  <p className="text-xs text-chat-text leading-relaxed whitespace-pre-wrap font-sans">
                    {page.text}
                  </p>
                </div>
              ))}
            </div>

            <div className="px-4 sm:px-6 py-3 border-t border-chat-border bg-chat-sidebar flex justify-end">
              <button
                onClick={() => setIsPagesModalOpen(false)}
                className="skeuo-btn px-4 py-2 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        window.document.body
      )}

      {/* Chunk Inspector Modal */}
      <ChunkInspectorModal
        isOpen={isChunksModalOpen}
        onClose={() => setIsChunksModalOpen(false)}
        documentName={document.name}
        chunks={chunks}
      />

      {/* Semantic Search Lab Modal */}
      <SemanticSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        sessionId={document.sessionId}
        documentName={document.name}
      />

      {/* Professional Remove Document Confirm Modal */}
      <ConfirmModal
        isOpen={isRemoveConfirmOpen}
        title="Remove Document"
        message={
          <span>
            Are you sure you want to detach and delete <strong className="text-chat-text font-bold">"{document.name}"</strong> and its vector chunks from this workspace?
          </span>
        }
        confirmLabel="Remove Document"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => {
          setIsRemoveConfirmOpen(false);
          onRemoveDocument?.();
        }}
        onCancel={() => setIsRemoveConfirmOpen(false)}
      />
    </>
  );
};
