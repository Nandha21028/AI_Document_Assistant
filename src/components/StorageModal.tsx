import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Database, Download, Upload, ShieldCheck, Trash2, HardDrive } from 'lucide-react';
import { quotaService, backupService, sessionRepository } from '../storage';
import type { StorageQuotaInfo } from '../storage/types';
import { ConfirmModal } from './ConfirmModal';

interface StorageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged: () => void;
}

export const StorageModal: React.FC<StorageModalProps> = ({
  isOpen,
  onClose,
  onDataChanged,
}) => {
  const [quota, setQuota] = useState<StorageQuotaInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadQuota = async () => {
    const q = await quotaService.getQuota();
    setQuota(q);
  };

  useEffect(() => {
    if (isOpen) {
      loadQuota();
      setStatusMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExport = async () => {
    try {
      setIsLoading(true);
      await backupService.exportBackup();
      setStatusMessage('Backup exported successfully.');
    } catch (err) {
      setStatusMessage(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    try {
      setIsLoading(true);
      const res = await backupService.importBackup(e.target.files[0]);
      setStatusMessage(`Imported ${res.sessionsImported} workspaces successfully.`);
      await loadQuota();
      onDataChanged();
    } catch (err) {
      setStatusMessage(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestPersistence = async () => {
    const granted = await quotaService.requestPersistence();
    await loadQuota();
    setStatusMessage(
      granted
        ? 'Persistent browser storage granted. Data will not be evicted under disk pressure.'
        : 'Browser could not grant persistent storage.'
    );
  };

  const handleExecuteClearAll = async () => {
    await sessionRepository.clearAll();
    await loadQuota();
    setStatusMessage('All local data cleared.');
    setIsClearAllConfirmOpen(false);
    onDataChanged();
    onClose();
  };

  const usedMB = quota ? (quota.usageBytes / (1024 * 1024)).toFixed(2) : '0';
  const quotaGB = quota ? (quota.quotaBytes / (1024 * 1024 * 1024)).toFixed(1) : '0';

  return createPortal(
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
        <div className="relative w-full max-w-xl skeuo-card bg-chat-card shadow-2xl overflow-hidden animate-modal-pop max-h-[90dvh] flex flex-col border border-chat-border">
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-chat-border bg-chat-sidebar skeuo-header shrink-0">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="p-2 rounded-xl skeuo-btn bg-chat-well text-chat-accent shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-bold text-chat-text flex items-center space-x-2 truncate">
                  <span>Browser Storage &amp; Backups</span>
                  <span className="skeuo-led skeuo-led-green animate-pulse-glow" />
                </h2>
                <p className="text-[11px] sm:text-xs text-chat-muted font-mono truncate">Persistent IndexedDB data management</p>
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
            {/* Usage Card */}
            <div className="p-3.5 sm:p-4 rounded-xl skeuo-well bg-chat-well space-y-3 shadow-inner">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-bold text-chat-text">
                  <HardDrive className="w-4 h-4 text-chat-accent" />
                  <span>IndexedDB Space Used</span>
                </div>
                <span className="font-mono text-xs text-chat-accent font-bold">
                  {usedMB} MB / {quotaGB} GB ({quota?.usagePercentage || 0}%)
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-chat-card rounded-full h-2.5 overflow-hidden border border-chat-border shadow-inner">
                <div
                  className="bg-chat-accent h-full transition-all duration-300 shimmer-bar"
                  style={{ width: `${Math.max(1, quota?.usagePercentage || 0)}%` }}
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pt-1">
                <span className="text-[10px] sm:text-[11px] text-chat-muted font-mono">
                  Status: {quota?.isPersistent ? 'Persistent (Protected)' : 'Standard Managed'}
                </span>
                {!quota?.isPersistent && (
                  <button
                    onClick={handleRequestPersistence}
                    className="text-xs text-chat-accent hover:underline font-bold self-start sm:self-auto"
                  >
                    Enable Persistent Storage
                  </button>
                )}
              </div>
            </div>

            {/* Backup Actions */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold text-chat-muted uppercase tracking-wider">
                Data Portability &amp; Backups
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  onClick={handleExport}
                  disabled={isLoading}
                  className="skeuo-btn flex items-center justify-center space-x-2 p-3 text-xs font-semibold min-h-[44px]"
                >
                  <Download className="w-4 h-4 text-chat-accent" />
                  <span>Export Backup (.json)</span>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="skeuo-btn flex items-center justify-center space-x-2 p-3 text-xs font-semibold min-h-[44px]"
                >
                  <Upload className="w-4 h-4 text-sky-500" />
                  <span>Import Backup</span>
                </button>
              </div>
            </div>

            {/* Privacy Guarantee */}
            <div className="p-3.5 rounded-xl skeuo-card bg-chat-card border border-emerald-500 flex items-center space-x-3 text-emerald-500 text-xs">
              <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
              <p className="leading-relaxed text-chat-text text-[11px] sm:text-xs">
                Documents, vectors, and messages are stored <strong>strictly inside your browser's private database</strong>. Zero cloud telemetry.
              </p>
            </div>

            {/* Status Message */}
            {statusMessage && (
              <div className="p-3 rounded-xl skeuo-well bg-chat-well text-xs text-chat-accent font-mono">
                {statusMessage}
              </div>
            )}

            {/* Danger Zone */}
            <div className="pt-3 border-t border-chat-border">
              <button
                onClick={() => setIsClearAllConfirmOpen(true)}
                className="flex items-center space-x-2 text-xs text-rose-500 hover:text-rose-400 hover:underline font-semibold min-h-[36px]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear and reset all local browser storage</span>
              </button>
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
      </div>

      {/* Clear All Data Confirm Dialog */}
      <ConfirmModal
        isOpen={isClearAllConfirmOpen}
        title="Reset All Local Browser Storage"
        message="This will permanently delete all workspaces, documents, chunk embeddings, and conversation histories from your IndexedDB database. This action cannot be undone."
        confirmLabel="Reset Everything"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleExecuteClearAll}
        onCancel={() => setIsClearAllConfirmOpen(false)}
      />
    </>,
    document.body
  );
};
