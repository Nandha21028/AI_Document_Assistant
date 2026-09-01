import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Cpu, Zap, ShieldCheck, AlertTriangle, CheckCircle2, HardDrive, Play, Loader2, Gauge } from 'lucide-react';
import type { HardwareCapability } from '../ai/models/types';
import { llmService } from '../ai/inference';
import type { GenerationMetrics } from '../ai/inference/types';

interface HardwareModalProps {
  isOpen: boolean;
  onClose: () => void;
  capability: HardwareCapability | null;
}

export const HardwareModal: React.FC<HardwareModalProps> = ({ isOpen, onClose, capability }) => {
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState<GenerationMetrics | null>(null);
  const [benchmarkError, setBenchmarkError] = useState<string | null>(null);

  if (!isOpen || !capability) return null;

  const isOptimal = capability.readinessStatus === 'optimal';

  const handleRunBenchmark = async () => {
    try {
      setIsBenchmarking(true);
      setBenchmarkError(null);
      const metrics = await llmService.runBenchmark();
      setBenchmarkResult(metrics);
    } catch (err) {
      setBenchmarkError(err instanceof Error ? err.message : 'Benchmark failed.');
    } finally {
      setIsBenchmarking(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl skeuo-card bg-chat-card shadow-2xl overflow-hidden animate-modal-pop border border-chat-border max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-chat-border bg-chat-sidebar skeuo-header shrink-0">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="p-2 rounded-xl skeuo-btn bg-chat-well text-chat-accent shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-chat-text flex items-center space-x-2 truncate">
                <span>Hardware &amp; WebGPU Engine</span>
                <span className={`skeuo-led ${isOptimal ? 'skeuo-led-green animate-pulse-glow' : 'skeuo-led-amber'}`} />
              </h2>
              <p className="text-[11px] sm:text-xs text-chat-muted font-mono truncate">Browser-side execution environment &amp; telemetry</p>
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
          {/* Status Banner */}
          <div className={`p-3.5 sm:p-4 rounded-xl skeuo-card border flex items-start space-x-3 ${
            isOptimal 
              ? 'bg-chat-well text-emerald-500 border-emerald-500' 
              : 'bg-chat-well text-amber-500 border-amber-500'
          }`}>
            {isOptimal ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            )}
            <div className="text-xs sm:text-sm">
              <p className="font-bold">{isOptimal ? 'WebGPU High-Performance Acceleration Ready' : 'WASM CPU Fallback Active'}</p>
              <p className="text-xs text-chat-muted mt-1">{capability.diagnosticsMessage}</p>
            </div>
          </div>

          {/* WebGPU Benchmark Tool Card */}
          <div className="p-3.5 sm:p-4 rounded-xl skeuo-well bg-chat-well space-y-3 shadow-inner">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Gauge className="w-4 h-4 text-chat-accent" />
                <h3 className="text-xs font-bold text-chat-text">Local GPU Speed Benchmark</h3>
              </div>
              <button
                onClick={handleRunBenchmark}
                disabled={isBenchmarking}
                className="skeuo-btn-primary flex items-center justify-center space-x-1.5 px-3 py-2 text-xs font-bold disabled:opacity-50 min-h-[40px]"
              >
                {isBenchmarking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isBenchmarking ? 'Benchmarking...' : 'Run GPU Benchmark'}</span>
              </button>
            </div>

            {benchmarkResult ? (
              <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-center">
                <div className="p-2 sm:p-2.5 rounded-lg skeuo-card bg-chat-card border border-chat-border">
                  <p className="text-[10px] text-chat-muted uppercase font-bold">Throughput</p>
                  <p className="text-xs sm:text-sm font-bold text-emerald-500 mt-0.5">
                    {benchmarkResult.tokensPerSecond} <span className="text-[9px] sm:text-[10px] font-normal">tok/s</span>
                  </p>
                </div>
                <div className="p-2 sm:p-2.5 rounded-lg skeuo-card bg-chat-card border border-chat-border">
                  <p className="text-[10px] text-chat-muted uppercase font-bold">First Token</p>
                  <p className="text-xs sm:text-sm font-bold text-sky-500 mt-0.5">
                    {benchmarkResult.ttftMs} <span className="text-[9px] sm:text-[10px] font-normal">ms</span>
                  </p>
                </div>
                <div className="p-2 sm:p-2.5 rounded-lg skeuo-card bg-chat-card border border-chat-border">
                  <p className="text-[10px] text-chat-muted uppercase font-bold">Backend</p>
                  <p className="text-xs sm:text-sm font-bold text-purple-400 mt-0.5 truncate">
                    {benchmarkResult.device.toUpperCase()}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-chat-muted leading-relaxed">
                Run a 64-token autoregressive generation test to measure graphics hardware throughput and latency in real time.
              </p>
            )}

            {benchmarkError && (
              <p className="text-xs text-rose-500 font-mono">{benchmarkError}</p>
            )}
          </div>

          {/* GPU Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl skeuo-card bg-chat-card">
              <div className="flex items-center space-x-2 text-chat-muted text-xs mb-1.5">
                <Cpu className="w-4 h-4 text-chat-accent" />
                <span className="font-bold">Primary GPU Adapter</span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-chat-text truncate">
                {capability.adapterInfo?.description || (capability.hasWebGPU ? 'Active WebGPU Adapter' : 'No GPU Adapter')}
              </p>
              <p className="text-[11px] text-chat-muted mt-0.5 font-mono truncate">
                Vendor: {capability.adapterInfo?.vendor || 'Standard Driver'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl skeuo-card bg-chat-card">
              <div className="flex items-center space-x-2 text-chat-muted text-xs mb-1.5">
                <HardDrive className="w-4 h-4 text-sky-500" />
                <span className="font-bold">CPU &amp; System Memory</span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-chat-text">
                {capability.logicalCores} Logical CPU Cores
              </p>
              <p className="text-[11px] text-chat-muted mt-0.5 font-mono">
                RAM: {capability.deviceMemoryGB ? `${capability.deviceMemoryGB} GB+` : 'Available'}
              </p>
            </div>
          </div>

          {/* Technical Specs & Limits */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-chat-muted uppercase tracking-wider">Engine Capabilities</h3>
            <div className="rounded-xl border border-chat-border skeuo-well bg-chat-well divide-y divide-chat-border text-xs">
              <div className="flex justify-between items-center py-2.5 px-3.5">
                <span className="text-chat-muted">WebGPU Direct Acceleration</span>
                <span className={`font-mono font-bold text-[11px] ${capability.hasWebGPU ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {capability.hasWebGPU ? 'Enabled (Direct3D 12/Metal/Vulkan)' : 'Disabled'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2.5 px-3.5">
                <span className="text-chat-muted">WebAssembly SIMD</span>
                <span className={`font-mono font-bold text-[11px] ${capability.hasWasmSIMD ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {capability.hasWasmSIMD ? 'Supported (128-bit SIMD)' : 'Not Supported'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2.5 px-3.5">
                <span className="text-chat-muted">SharedArrayBuffer</span>
                <span className={`font-mono font-bold text-[11px] ${capability.hasSharedArrayBuffer ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {capability.hasSharedArrayBuffer ? 'Active (Isolated Origin)' : 'Inactive'}
                </span>
              </div>
              {capability.limits && (
                <div className="flex justify-between items-center py-2.5 px-3.5">
                  <span className="text-chat-muted">Max WebGPU Buffer Size</span>
                  <span className="font-mono text-chat-text font-bold text-[11px]">
                    {(capability.limits.maxBufferSize / (1024 * 1024)).toFixed(0)} MB
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Security & Privacy Card */}
          <div className="p-3.5 rounded-xl skeuo-card bg-chat-card flex items-center space-x-3">
            <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
            <p className="text-xs text-chat-muted leading-relaxed">
              <strong className="text-chat-text font-bold">100% Client-Side Privacy:</strong> Embeddings, PDF extraction, and local LLM execution run directly on your device. Zero telemetry or data egress.
            </p>
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
