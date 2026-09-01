import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Bot, Zap, Download, CheckCircle2, Loader2, Sparkles, HardDrive } from 'lucide-react';
import { SUPPORTED_LLM_MODELS } from '../ai/inference/types';
import { useLLM } from '../ai/inference';

interface ModelManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModelManagerModal: React.FC<ModelManagerModalProps> = ({ isOpen, onClose }) => {
  const { isLoaded, isLoading, downloadProgress, error, modelStatus, loadModel } = useLLM();
  const [selectedModelId, setSelectedModelId] = useState(modelStatus.currentModelId);

  if (!isOpen) return null;

  const handleDownloadModel = async (id: string) => {
    setSelectedModelId(id);
    await loadModel(id);
  };

  const progressPercent = downloadProgress?.progress || (downloadProgress?.total && downloadProgress?.loaded ? Math.round((downloadProgress.loaded / downloadProgress.total) * 100) : 0);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl skeuo-card bg-chat-card shadow-2xl overflow-hidden animate-modal-pop border border-chat-border max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-chat-border bg-chat-sidebar skeuo-header shrink-0">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="p-2 rounded-xl skeuo-btn bg-chat-well text-chat-accent shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-chat-text flex items-center space-x-2 truncate">
                <span>Local LLM &amp; WebGPU Engine</span>
                <span className={`skeuo-led ${isLoaded ? 'skeuo-led-purple animate-pulse-glow' : 'skeuo-led-cyan'}`} />
              </h2>
              <p className="text-[11px] sm:text-xs text-chat-muted font-mono truncate">Open-weight browser-side inference</p>
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
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          {/* Active Model Status Banner */}
          <div className={`p-3.5 sm:p-4 rounded-xl skeuo-card border flex items-start space-x-3 ${
            isLoaded 
              ? 'bg-chat-well text-emerald-500 border-emerald-500' 
              : 'bg-chat-well border-chat-border text-chat-text'
          }`}>
            {isLoaded ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            ) : isLoading ? (
              <Loader2 className="w-5 h-5 text-chat-accent animate-spin shrink-0 mt-0.5" />
            ) : (
              <Bot className="w-5 h-5 text-chat-accent shrink-0 mt-0.5" />
            )}
            <div className="text-xs space-y-1">
              <p className="font-bold text-xs sm:text-sm">
                {isLoaded ? 'Qwen Model Ready in Browser VRAM' : isLoading ? 'Downloading & Caching Model Weights...' : 'Model Ready to Load'}
              </p>
              <p className="opacity-85 font-mono text-[10px] sm:text-[11px]">
                {isLoaded
                  ? `Active Backend: ${modelStatus.activeDevice.toUpperCase()} • Quantization: 4-bit (q4)`
                  : 'Weights download directly from HuggingFace and cache permanently in browser CacheStorage.'}
              </p>
            </div>
          </div>

          {/* Download Progress Bar */}
          {isLoading && (
            <div className="p-3.5 sm:p-4 rounded-xl skeuo-well bg-chat-well space-y-2.5 shadow-inner">
              <div className="flex justify-between text-xs font-bold text-chat-text">
                <span className="truncate max-w-[200px]">{downloadProgress?.name || downloadProgress?.file || 'Downloading model files...'}</span>
                <span className="font-mono text-chat-accent">{progressPercent}%</span>
              </div>
              <div className="w-full bg-chat-card rounded-full h-2.5 overflow-hidden border border-chat-border shadow-inner">
                <div
                  className="bg-chat-accent h-full transition-all duration-200 shimmer-bar"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-[10px] sm:text-[11px] text-chat-muted">
                Initial download (~350MB) is stored in browser CacheStorage for instant offline launch.
              </p>
            </div>
          )}

          {/* Model Selection List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-chat-muted uppercase tracking-wider">
              Available Local Models
            </h3>

            <div className="space-y-2.5">
              {SUPPORTED_LLM_MODELS.map((model) => {
                const isSelected = selectedModelId === model.id;
                const isCurrentlyLoaded = isLoaded && modelStatus.currentModelId === model.id;

                return (
                  <div
                    key={model.id}
                    className={`p-3.5 sm:p-4 rounded-xl transition-all ${
                      isSelected
                        ? 'skeuo-card bg-chat-card border-chat-accent shadow-md'
                        : 'skeuo-well bg-chat-well hover:border-chat-border'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-xs font-bold text-chat-text">{model.name}</h4>
                          <span className="text-[10px] font-mono skeuo-pill px-2 py-0.5 text-chat-accent font-bold">
                            {model.quantization}
                          </span>
                        </div>
                        <p className="text-[11px] text-chat-muted leading-relaxed">
                          {model.description}
                        </p>
                        <div className="flex items-center space-x-3 text-[10px] font-mono text-chat-muted pt-1">
                          <span className="flex items-center space-x-1">
                            <HardDrive className="w-3 h-3 text-sky-500" />
                            <span>~{model.sizeMB} MB</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Zap className="w-3 h-3 text-emerald-500" />
                            <span>WebGPU Ready</span>
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDownloadModel(model.id)}
                        disabled={isLoading || isCurrentlyLoaded}
                        className={`px-3 py-2 text-xs font-semibold shrink-0 transition-all min-h-[40px] flex items-center justify-center ${
                          isCurrentlyLoaded
                            ? 'skeuo-btn text-emerald-500 border border-emerald-500 cursor-default'
                            : 'skeuo-btn-primary'
                        }`}
                      >
                        {isCurrentlyLoaded ? (
                          <span className="flex items-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Active</span>
                          </span>
                        ) : isLoading && isSelected ? (
                          <span className="flex items-center space-x-1">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Loading...</span>
                          </span>
                        ) : (
                          <span className="flex items-center space-x-1">
                            <Download className="w-3.5 h-3.5" />
                            <span>Load Model</span>
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 rounded-xl skeuo-well bg-chat-well border border-rose-500 text-xs text-rose-500 font-mono">
              {error}
            </div>
          )}

          {/* Privacy Footnote */}
          <div className="p-3 rounded-xl skeuo-well bg-chat-well text-[10px] sm:text-[11px] text-chat-muted flex items-center space-x-2 font-mono">
            <Sparkles className="w-4 h-4 text-chat-accent shrink-0" />
            <span>Inference runs 100% on local graphics card / CPU. Zero data transmitted.</span>
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
