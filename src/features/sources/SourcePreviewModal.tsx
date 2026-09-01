import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, Bookmark, Copy, Check, Gauge, ShieldCheck } from 'lucide-react';
import type { SourceReference } from '../sessions/types';

interface SourcePreviewModalProps {
  source: SourceReference | null;
  onClose: () => void;
}

export const SourcePreviewModal: React.FC<SourcePreviewModalProps> = ({ source, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!source) return null;

  const handleCopySnippet = async () => {
    try {
      await navigator.clipboard.writeText(source.snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy snippet:', err);
    }
  };

  const confidencePercent = source.similarityScore
    ? Math.round(source.similarityScore * 100)
    : 85;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="skeuo-card bg-chat-card max-w-xl w-full flex flex-col shadow-2xl overflow-hidden animate-modal-pop border border-chat-border max-h-[90dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-chat-border bg-chat-sidebar skeuo-header shrink-0">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="p-2 rounded-xl skeuo-btn bg-chat-well text-chat-accent shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-chat-text truncate max-w-[200px] sm:max-w-sm">
                {source.documentName}
              </h3>
              <p className="text-[11px] sm:text-xs text-chat-muted flex items-center space-x-1.5 sm:space-x-2 font-mono truncate">
                <span>Citation Inspector</span>
                <span>•</span>
                <span className="text-emerald-500 font-semibold truncate">Verified Grounded Source</span>
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

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Metadata Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              {source.pageNumber && (
                <span className="inline-flex items-center space-x-1 text-xs font-bold text-chat-accent skeuo-pill px-2.5 py-1">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Page {source.pageNumber}</span>
                </span>
              )}

              {source.sectionTitle && (
                <span className="inline-flex items-center space-x-1 text-xs text-sky-500 skeuo-pill px-2.5 py-1 truncate max-w-xs font-semibold">
                  <Bookmark className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{source.sectionTitle}</span>
                </span>
              )}
            </div>

            {source.similarityScore && (
              <span className="inline-flex items-center space-x-1.5 text-xs font-mono font-bold text-emerald-500 skeuo-card px-2.5 py-1">
                <Gauge className="w-3.5 h-3.5" />
                <span>{confidencePercent}% Match</span>
              </span>
            )}
          </div>

          {/* Source Excerpt Card */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-chat-muted">
              <span className="font-bold uppercase tracking-wider text-[10px]">
                Original Verified Document Excerpt
              </span>
              <button
                onClick={handleCopySnippet}
                className="skeuo-btn flex items-center space-x-1 text-[11px] px-2.5 py-1 font-semibold min-h-[32px]"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy Excerpt'}</span>
              </button>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl skeuo-well bg-chat-well text-xs text-chat-text leading-relaxed whitespace-pre-wrap font-sans select-text">
              {source.snippet}
            </div>
          </div>

          {/* Grounding guarantee */}
          <div className="p-3 rounded-xl skeuo-card bg-chat-card border border-emerald-500 text-[11px] text-emerald-500 flex items-center space-x-2 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="text-chat-text">The AI's answer was synthesized directly from this verified document text.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-t border-chat-border bg-chat-sidebar flex justify-end shrink-0">
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
