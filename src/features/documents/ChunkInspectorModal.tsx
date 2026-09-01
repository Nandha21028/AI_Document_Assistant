import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Layers, FileText, Hash, Bookmark, Binary } from 'lucide-react';
import type { DocumentChunk } from '../sessions/types';

interface ChunkInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentName: string;
  chunks: DocumentChunk[];
}

export const ChunkInspectorModal: React.FC<ChunkInspectorModalProps> = ({
  isOpen,
  onClose,
  documentName,
  chunks,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPageFilter, setSelectedPageFilter] = useState<number | 'all'>('all');
  const [inspectedVectorChunkId, setInspectedVectorChunkId] = useState<string | null>(null);

  const distinctPages = useMemo(() => {
    const pages = new Set<number>();
    chunks.forEach((c) => {
      if (c.pageNumber) pages.add(c.pageNumber);
    });
    return Array.from(pages).sort((a, b) => a - b);
  }, [chunks]);

  const filteredChunks = useMemo(() => {
    return chunks.filter((c) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        c.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.sectionTitle && c.sectionTitle.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesPage =
        selectedPageFilter === 'all' || c.pageNumber === selectedPageFilter;

      return matchesSearch && matchesPage;
    });
  }, [chunks, searchQuery, selectedPageFilter]);

  if (!isOpen) return null;

  const embeddedCount = chunks.filter((c) => c.embedding && c.embedding.length > 0).length;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl skeuo-card bg-chat-card shadow-2xl max-h-[90dvh] flex flex-col overflow-hidden animate-modal-pop border border-chat-border">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-chat-border bg-chat-sidebar skeuo-header shrink-0">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="p-2 rounded-xl skeuo-btn bg-chat-well text-purple-400 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-chat-text flex items-center space-x-2 truncate">
                <span>Document Chunks &amp; Vector Embeddings</span>
                <span className="skeuo-led skeuo-led-purple animate-pulse-glow" />
              </h2>
              <p className="text-[11px] sm:text-xs text-chat-muted font-mono truncate">
                {chunks.length} chunks • <span className="text-emerald-500 font-bold">{embeddedCount} vectors</span> from <span className="text-chat-text font-medium">{documentName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="skeuo-btn p-1.5 text-chat-muted hover:text-chat-text shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls */}
        <div className="px-4 sm:px-6 py-3 border-b border-chat-border bg-chat-well flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
          {/* Search Bar */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-chat-muted absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chunks or section headings..."
              className="w-full skeuo-well pl-9 pr-3 py-1.5 text-xs text-chat-text placeholder:text-chat-muted focus:outline-none focus:border-chat-accent font-sans min-h-[36px]"
            />
          </div>

          {/* Page Filter Pill list */}
          {distinctPages.length > 1 && (
            <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 font-mono">
              <span className="text-[11px] text-chat-muted shrink-0">Page:</span>
              <button
                onClick={() => setSelectedPageFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all min-h-[32px] ${
                  selectedPageFilter === 'all'
                    ? 'skeuo-btn-primary text-white'
                    : 'skeuo-btn text-chat-muted hover:text-chat-text'
                }`}
              >
                All
              </button>
              {distinctPages.map((pg) => (
                <button
                  key={pg}
                  onClick={() => setSelectedPageFilter(pg)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all min-h-[32px] ${
                    selectedPageFilter === pg
                      ? 'skeuo-btn-primary text-white'
                      : 'skeuo-btn text-chat-muted hover:text-chat-text'
                  }`}
                >
                  p.{pg}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Chunks List Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {filteredChunks.length === 0 ? (
            <div className="text-center py-12 text-xs text-chat-muted">
              No chunks match your search criteria.
            </div>
          ) : (
            filteredChunks.map((chunk) => {
              const hasEmbedding = chunk.embedding && chunk.embedding.length > 0;
              const isShowingVector = inspectedVectorChunkId === chunk.id;

              return (
                <div
                  key={chunk.id}
                  className="skeuo-card p-3.5 sm:p-4 space-y-2.5 hover:border-chat-border transition-colors"
                >
                  {/* Chunk Metadata Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center space-x-1 font-mono text-[11px] text-purple-400 skeuo-pill px-2.5 py-0.5 font-bold">
                        <Hash className="w-3 h-3" />
                        <span>Chunk {chunk.chunkIndex + 1}</span>
                      </span>

                      {chunk.pageNumber && (
                        <span className="inline-flex items-center space-x-1 text-[11px] text-chat-muted skeuo-pill px-2.5 py-0.5 font-bold">
                          <FileText className="w-3 h-3 text-chat-accent" />
                          <span>Page {chunk.pageNumber}</span>
                        </span>
                      )}

                      {chunk.sectionTitle && (
                        <span className="inline-flex items-center space-x-1 text-[11px] text-sky-500 skeuo-pill px-2.5 py-0.5 max-w-xs truncate font-semibold">
                          <Bookmark className="w-3 h-3 shrink-0" />
                          <span className="truncate">{chunk.sectionTitle}</span>
                        </span>
                      )}

                      {hasEmbedding && (
                        <button
                          onClick={() => setInspectedVectorChunkId(isShowingVector ? null : chunk.id)}
                          className="skeuo-btn inline-flex items-center space-x-1 text-[11px] text-emerald-500 px-2 py-0.5 font-mono font-bold min-h-[28px]"
                          title="Click to view 384-dimensional dense vector coordinates"
                        >
                          <Binary className="w-3 h-3" />
                          <span>384-dim Vector</span>
                        </button>
                      )}
                    </div>

                    <div className="text-[11px] text-chat-muted font-mono space-x-2">
                      <span>{chunk.text.length} chars</span>
                      <span>•</span>
                      <span>~{chunk.tokenCount} tokens</span>
                    </div>
                  </div>

                  {/* Vector Coordinates Drawer */}
                  {isShowingVector && chunk.embedding && (
                    <div className="p-3 rounded-lg skeuo-well bg-chat-well border border-emerald-500/30 text-[11px] font-mono text-emerald-600 dark:text-emerald-300 space-y-1 animate-in fade-in duration-150">
                      <div className="flex justify-between text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                        <span>L2-Normalized Float32 Embedding Array (Length: {chunk.embedding.length})</span>
                        <span>Unit Norm (||v|| = 1.0)</span>
                      </div>
                      <p className="break-all opacity-90 leading-relaxed max-h-24 overflow-y-auto">
                        [{chunk.embedding.slice(0, 16).map((n) => n.toFixed(4)).join(', ')}, ... +{chunk.embedding.length - 16} more floats]
                      </p>
                    </div>
                  )}

                  {/* Chunk Body */}
                  <p className="text-xs text-chat-text leading-relaxed whitespace-pre-wrap font-sans skeuo-well p-3 sm:p-3.5 bg-chat-well">
                    {chunk.text}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-t border-chat-border bg-chat-sidebar flex items-center justify-between shrink-0">
          <span className="text-[11px] sm:text-xs text-chat-muted font-mono truncate">
            Showing {filteredChunks.length} of {chunks.length} chunks
          </span>
          <button
            onClick={onClose}
            className="skeuo-btn px-4 py-2 text-xs font-semibold min-h-[40px]"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
