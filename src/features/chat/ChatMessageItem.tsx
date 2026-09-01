import React, { useState } from 'react';
import { User, Bot, Copy, Check, FileText, ShieldCheck, Gauge, Zap, Cpu, ChevronDown, ChevronUp, Layers, Sparkles } from 'lucide-react';
import type { ChatMessage, SourceReference } from '../sessions/types';
import { GroundedTextRenderer } from './GroundedTextRenderer';

interface ChatMessageItemProps {
  message: ChatMessage;
  onSelectSource?: (source: SourceReference) => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ message, onSelectSource }) => {
  const [copied, setCopied] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const hasSources = message.sources && message.sources.length > 0;
  const metrics = message.metrics;
  const avgConfidence = hasSources
    ? Math.round(
        (message.sources!.reduce((sum, s) => sum + (s.similarityScore || 0.7), 0) /
          message.sources!.length) *
          100
      )
    : 0;

  return (
    <div
      className={`group flex items-start space-x-3 sm:space-x-4 py-4 px-4 sm:px-5 rounded-2xl animate-message-entrance transition-all ${
        isUser
          ? 'skeuo-card bg-chat-cardSubtle ml-6 sm:ml-20 border-chat-border shadow-sm'
          : 'skeuo-card bg-chat-card mr-4 sm:mr-12 border-chat-border shadow-md'
      }`}
    >
      {/* Role Avatar */}
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
          isUser
            ? 'skeuo-btn-primary text-white'
            : 'skeuo-btn text-chat-accent'
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-chat-accent" />}
      </div>

      {/* Message Body & Metadata */}
      <div className="flex-1 min-w-0 space-y-2.5">
        {/* Header: Name + Timestamp + Copy Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-extrabold text-chat-text flex items-center space-x-1.5">
              <span>{isUser ? 'You' : 'DocAssistant (Local Qwen)'}</span>
              {!isUser && <span className="skeuo-led skeuo-led-purple" />}
            </span>
            <span className="text-[11px] text-chat-muted font-mono font-medium">
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          <div className="flex items-center space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              className="skeuo-btn p-1 text-chat-muted hover:text-chat-text transition-colors"
              title="Copy text"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-chat-accent" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Text Content */}
        <div className="text-chat-text text-sm leading-relaxed font-sans select-text">
          {isUser ? (
            <div className="whitespace-pre-wrap font-semibold text-chat-text">
              {message.content}
            </div>
          ) : (
            <GroundedTextRenderer
              content={message.content}
              sources={message.sources}
              onSelectSource={onSelectSource}
            />
          )}

          {/* Streaming Cursor Animation */}
          {message.isStreaming && (
            <span className="inline-block w-2 h-4 ml-1 bg-chat-accent animate-pulse align-middle rounded-sm shadow-sm" />
          )}
        </div>

        {/* Minimal Response Details Accordion */}
        {!isUser && !message.isStreaming && (hasSources || metrics) && (
          <div className="pt-2 border-t border-chat-border/60">
            {/* Accordion Toggle Header (Minimal Summary Bar) */}
            <button
              onClick={() => setIsDetailsOpen(!isDetailsOpen)}
              className="w-full flex items-center justify-between py-1.5 px-2.5 rounded-xl skeuo-btn hover:border-chat-accent transition-all text-xs select-none group/acc"
              title={isDetailsOpen ? 'Click to collapse response details' : 'Click to inspect sources & hardware telemetry'}
            >
              <div className="flex items-center space-x-2 truncate">
                {hasSources ? (
                  <span className="flex items-center space-x-1.5 text-chat-accent font-bold text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5 text-chat-accent shrink-0" />
                    <span>Verified Grounded</span>
                    <span className="text-chat-border mx-0.5">•</span>
                    <span className="font-mono text-[10px] text-sky-500 font-bold flex items-center space-x-0.5">
                      <Gauge className="w-3 h-3" />
                      <span>{avgConfidence}% Match</span>
                    </span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-1 text-amber-500 font-bold text-[11px]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Direct Synthesis</span>
                  </span>
                )}

                {hasSources && (
                  <span className="inline-flex items-center space-x-1 font-mono text-[10px] skeuo-pill px-2 py-0.5 text-chat-muted font-bold">
                    <Layers className="w-3 h-3 text-chat-accent" />
                    <span>{message.sources!.length} {message.sources!.length === 1 ? 'Source' : 'Sources'}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                {metrics && (
                  <span className="hidden sm:inline-flex items-center space-x-1 font-mono text-[10px] text-amber-500 font-extrabold">
                    <Zap className="w-3 h-3" />
                    <span>{metrics.tokensPerSecond} tok/s</span>
                  </span>
                )}
                <span className="text-[10px] text-chat-muted font-semibold group-hover/acc:text-chat-text flex items-center space-x-1">
                  <span>{isDetailsOpen ? 'Hide' : 'Details'}</span>
                  {isDetailsOpen ? (
                    <ChevronUp className="w-3.5 h-3.5 text-chat-muted group-hover/acc:text-chat-text" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-chat-muted group-hover/acc:text-chat-text" />
                  )}
                </span>
              </div>
            </button>

            {/* Accordion Body (Expanded Details & Source Pills) */}
            {isDetailsOpen && (
              <div className="mt-2.5 pt-2.5 border-t border-chat-border/40 space-y-2.5 animate-message-entrance">
                {/* Full Real-Time Telemetry Breakdown */}
                {metrics && (
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono skeuo-well p-2.5 rounded-xl bg-chat-well">
                    <div className="flex items-center space-x-3 text-chat-muted">
                      <span className="flex items-center space-x-1 text-amber-500 font-extrabold">
                        {metrics.device === 'webgpu' ? <Zap className="w-3.5 h-3.5" /> : <Cpu className="w-3.5 h-3.5 text-sky-500" />}
                        <span>{metrics.tokensPerSecond} tok/s</span>
                      </span>
                      <span>•</span>
                      <span>TTFT: <strong className="text-chat-text font-bold">{metrics.ttftMs}ms</strong></span>
                      <span>•</span>
                      <span className="text-purple-400 font-bold">{metrics.device.toUpperCase()}</span>
                    </div>
                    <span className="text-[10px] text-chat-muted">In-Browser Qwen Engine</span>
                  </div>
                )}

                {/* Full Interactive Source Citation Pills Grid */}
                {hasSources && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-chat-muted">
                      <span className="flex items-center space-x-1.5">
                        <FileText className="w-3.5 h-3.5 text-chat-accent" />
                        <span>Grounded Sources ({message.sources!.length}):</span>
                      </span>
                      <span className="text-[10px] font-normal text-chat-muted">Click any to inspect excerpt</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {message.sources!.map((source, index) => (
                        <button
                          key={`${source.chunkId}-${index}`}
                          onClick={() => onSelectSource?.(source)}
                          className="skeuo-btn flex items-center justify-between p-2 rounded-xl text-left text-xs hover:border-chat-accent transition-all group/src"
                          title={`Click to inspect passage from ${source.documentName}`}
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <span className="font-mono font-extrabold text-chat-accent text-[11px] px-1.5 py-0.5 rounded skeuo-well shrink-0">
                              [{index + 1}]
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center space-x-1 font-bold text-chat-text text-[11px] truncate">
                                {source.pageNumber && <span>p.{source.pageNumber}</span>}
                                {source.sectionTitle && (
                                  <span className="text-chat-muted font-medium truncate">• {source.sectionTitle}</span>
                                )}
                              </div>
                              <p className="text-[10px] text-chat-muted truncate max-w-[180px] font-mono">
                                {source.documentName}
                              </p>
                            </div>
                          </div>
                          {source.similarityScore && (
                            <span className="font-mono text-[10px] text-sky-500 font-bold shrink-0 ml-1">
                              {Math.round(source.similarityScore * 100)}%
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
