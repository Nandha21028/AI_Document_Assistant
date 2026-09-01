import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, Info, X } from 'lucide-react';

export type ConfirmVariant = 'danger' | 'warning' | 'info';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return (
          <div className="p-2.5 sm:p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 shadow-sm shrink-0">
            <Trash2 className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
          </div>
        );
      case 'warning':
        return (
          <div className="p-2.5 sm:p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 shadow-sm shrink-0">
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
          </div>
        );
      case 'info':
      default:
        return (
          <div className="p-2.5 sm:p-3 rounded-2xl bg-chat-well border border-chat-accent/40 text-chat-accent shadow-sm shrink-0">
            <Info className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        );
    }
  };

  const getConfirmButtonClasses = () => {
    switch (variant) {
      case 'danger':
        return 'bg-gradient-to-b from-rose-500 to-rose-700 hover:from-rose-400 hover:to-rose-600 text-white font-bold border border-rose-400/40 shadow-lg shadow-rose-900/30 active:scale-95';
      case 'warning':
        return 'bg-gradient-to-b from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-white font-bold border border-amber-400/40 shadow-lg shadow-amber-900/30 active:scale-95';
      case 'info':
      default:
        return 'skeuo-btn-primary active:scale-95';
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <div
        className="relative w-full max-w-md skeuo-card bg-chat-card border border-chat-border shadow-2xl overflow-hidden animate-modal-pop p-4 sm:p-6 space-y-4 sm:space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Top-Right Icon */}
        <button
          onClick={onCancel}
          className="absolute right-3.5 top-3.5 p-1.5 rounded-lg text-chat-muted hover:text-chat-text hover:bg-chat-well transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
          title="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content Body */}
        <div className="flex items-start space-x-3 sm:space-x-4">
          {getIcon()}
          <div className="space-y-1 min-w-0 flex-1 pr-3">
            <h3 className="text-sm sm:text-base font-extrabold text-chat-text tracking-tight">
              {title}
            </h3>
            <div className="text-xs text-chat-muted leading-relaxed font-medium">
              {message}
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-end space-x-2.5 sm:space-x-3 pt-3 border-t border-chat-border">
          <button
            type="button"
            onClick={onCancel}
            className="skeuo-btn px-3.5 sm:px-4 py-2 text-xs font-bold text-chat-text hover:text-chat-text min-h-[40px]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs min-h-[40px] font-bold transition-all ${getConfirmButtonClasses()}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
