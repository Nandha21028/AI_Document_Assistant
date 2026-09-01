import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Sparkles, FileText, Hash, Bookmark, Loader2, Gauge } from 'lucide-react';
import { retriever } from '../../ai/retrieval';
import type { RetrievedChunk } from '../../ai/retrieval/types';

interface SemanticSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  documentName: string;
}

export const SemanticSearchModal: React.FC<SemanticSearchModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  documentName,
}) => {
  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState(3);
  const [minScore, setMinScore] = useState(0.35);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<RetrievedChunk[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async () => {
    if (!query.trim()) return;

    try {
      setIsSearching(true);
      setHasSearched(true);
      const retrieved = await retriever.retrieve(query, sessionId, {
        topK,
        minSimilarityScore: minScore,
      });
      setResults(retrieved);
    } catch (err) {
      console.error('Semantic search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl skeuo-card bg-chat-card shadow-2xl max-h-[90dvh] flex flex-col overflow-hidden animate-modal-pop border border-chat-border">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-chat-border bg-chat-sidebar skeuo-header shrink-0">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="p-2 rounded-xl skeuo-btn bg-chat-well text-sky-500 shrink-0">
              <Search className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-chat-text flex items-center space-x-2 truncate">
                <span>Semantic Vector Retrieval Lab</span>
                <span className="skeuo-led skeuo-led-cyan animate-pulse-glow" />
              </h2>
              <p className="text-[11px] sm:text-xs text-chat-muted font-mono truncate">
                Cosine similarity testing on <span className="text-chat-text font-semibold">{documentName}</span>
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

        {/* Query & Parameter Controls */}
        <div className="p-4 sm:p-6 border-b border-chat-border bg-chat-well space-y-3 sm:space-y-4 shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-chat-muted absolute left-3.5 top-3" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Ask or search anything (e.g. 'What was the revenue increase?')..."
                className="w-full skeuo-well px-4 pl-10 py-2.5 text-xs sm:text-sm text-chat-text placeholder:text-chat-muted focus:outline-none focus:border-chat-accent font-sans min-h-[42px]"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isSearching || !query.trim()}
              className="skeuo-btn-primary flex items-center justify-center space-x-1.5 px-4 py-2.5 text-xs font-semibold disabled:opacity-50 min-h-[42px]"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>Search</span>
            </button>
          </div>

          {/* Hyperparameters */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-chat-muted pt-1">
            <div className="flex items-center space-x-2 font-mono">
              <span className="font-bold text-chat-text">Top-K:</span>
              <div className="flex items-center space-x-1">
                {[1, 3, 5, 8].map((k) => (
                  <button
                    key={k}
                    onClick={() => setTopK(k)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all min-h-[32px] min-w-[32px] ${
                      topK === k
                        ? 'skeuo-btn-primary text-white'
                        : 'skeuo-btn text-chat-muted hover:text-chat-text'
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2 font-mono">
              <span className="font-bold text-chat-text">Min Score:</span>
              <input
                type="range"
                min="0.10"
                max="0.80"
                step="0.05"
                value={minScore}
                onChange={(e) => setMinScore(parseFloat(e.target.value))}
                className="w-24 sm:w-28 accent-chat-accent cursor-pointer"
              />
              <span className="text-chat-text font-bold text-[11px] skeuo-pill px-2 py-0.5">
                {(minScore * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {/* Retrieval Results Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {!hasSearched ? (
            <div className="text-center py-12 text-xs text-chat-muted space-y-1.5">
              <p className="font-bold text-chat-text text-sm">Enter a search phrase to run vector matching.</p>
              <p className="font-mono">The query will be embedded in-browser and matched via cosine similarity.</p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 text-xs text-amber-500 space-y-1">
              <p className="font-bold">No chunks matched the similarity threshold ({(minScore * 100).toFixed(0)}%).</p>
              <p className="text-chat-muted">Try lowering the minimum score or expanding your query.</p>
            </div>
          ) : (
            results.map((result) => {
              const scorePercent = Math.round(result.similarityScore * 100);

              return (
                <div
                  key={result.chunk.id}
                  className="skeuo-card p-3.5 sm:p-4 space-y-3 hover:border-chat-accent transition-colors"
                >
                  {/* Top Bar: Rank, Page, Score */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-[11px] font-bold text-sky-500 skeuo-pill px-2.5 py-0.5">
                        Rank #{result.rank}
                      </span>

                      {result.chunk.pageNumber && (
                        <span className="inline-flex items-center space-x-1 text-[11px] text-chat-text skeuo-pill px-2 py-0.5 font-bold">
                          <FileText className="w-3 h-3 text-chat-accent" />
                          <span>Page {result.chunk.pageNumber}</span>
                        </span>
                      )}

                      {result.chunk.sectionTitle && (
                        <span className="inline-flex items-center space-x-1 text-[11px] text-purple-400 skeuo-pill px-2 py-0.5 max-w-xs truncate font-semibold">
                          <Bookmark className="w-3 h-3 shrink-0" />
                          <span className="truncate">{result.chunk.sectionTitle}</span>
                        </span>
                      )}

                      <span className="inline-flex items-center space-x-1 text-[11px] text-chat-muted font-mono">
                        <Hash className="w-3 h-3" />
                        <span>Chunk {result.chunk.chunkIndex + 1}</span>
                      </span>
                    </div>

                    {/* Cosine Similarity Score Badge */}
                    <div className="flex items-center space-x-1.5 px-2.5 py-1 skeuo-well text-emerald-500 font-mono text-xs font-bold">
                      <Gauge className="w-3.5 h-3.5" />
                      <span>{scorePercent}% Match ({result.similarityScore.toFixed(4)})</span>
                    </div>
                  </div>

                  {/* Chunk Text */}
                  <p className="text-xs text-chat-text leading-relaxed whitespace-pre-wrap font-sans skeuo-well p-3.5 bg-chat-well">
                    {result.chunk.text}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-t border-chat-border bg-chat-sidebar flex items-center justify-between shrink-0">
          <span className="text-[11px] sm:text-xs text-chat-muted font-mono truncate">
            {results.length > 0 ? `Retrieved ${results.length} relevant chunks` : 'Awaiting query execution'}
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
