import React, { useState } from 'react';
import { Zap, Shield, FileText, Edit3, Check, X, Loader2, Menu } from 'lucide-react';
import type { Session, DocumentRecord } from '../features/sessions/types';
import type { HardwareCapability } from '../ai/models/types';
import { useLLM } from '../ai/inference';
import { ThemeSelector } from './ThemeSelector';

interface HeaderProps {
  activeSession: Session | null;
  activeDocument: DocumentRecord | null;
  capability: HardwareCapability | null;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onOpenHardwareModal: () => void;
  onOpenModelModal: () => void;
  onOpenSecurityModal: () => void;
  onRenameSession: (id: string, newTitle: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeSession,
  activeDocument,
  capability,
  isSidebarOpen,
  onToggleSidebar,
  onOpenHardwareModal,
  onOpenModelModal,
  onOpenSecurityModal,
  onRenameSession,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const { isLoaded, isLoading } = useLLM();

  const handleStartRename = () => {
    if (activeSession) {
      setTitleDraft(activeSession.title);
      setIsEditingTitle(true);
    }
  };

  const handleSaveRename = () => {
    if (activeSession && titleDraft.trim()) {
      onRenameSession(activeSession.id, titleDraft.trim());
    }
    setIsEditingTitle(false);
  };

  const handleCancelRename = () => {
    setIsEditingTitle(false);
  };

  const isOptimal = capability?.readinessStatus === 'optimal';

  return (
    <header className="h-14 skeuo-header bg-chat-bg px-2 sm:px-4 flex items-center justify-between shrink-0 select-none z-20 gap-2 border-b border-chat-border">
      {/* Left: Mobile Hamburger & Active Session Title */}
      <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 overflow-hidden">
        {/* Mobile Hamburger Toggle Button */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden skeuo-btn p-2 text-chat-muted hover:text-chat-text min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0"
            title={isSidebarOpen ? 'Close Menu' : 'Open Menu'}
            aria-label="Toggle Sidebar"
          >
            <Menu className="w-4 h-4 text-chat-accent" />
          </button>
        )}

        {isEditingTitle ? (
          <div className="flex items-center space-x-1.5 animate-message-entrance min-w-0">
            <input
              type="text"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveRename();
                if (e.key === 'Escape') handleCancelRename();
              }}
              autoFocus
              className="skeuo-well px-2.5 py-1 text-xs sm:text-sm font-bold text-chat-text focus:outline-none focus:border-chat-accent font-sans max-w-[150px] sm:max-w-xs"
            />
            <button
              onClick={handleSaveRename}
              className="skeuo-btn p-1 text-emerald-500 hover:text-emerald-400 shrink-0"
              title="Save"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={handleCancelRename}
              className="skeuo-btn p-1 text-chat-muted hover:text-chat-text shrink-0"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 group min-w-0">
            <h1 className="text-xs sm:text-sm font-black text-chat-text truncate max-w-[120px] sm:max-w-xs md:max-w-md tracking-tight">
              {activeSession?.title || 'Document Assistant'}
            </h1>
            {activeSession && (
              <button
                onClick={handleStartRename}
                className="opacity-0 group-hover:opacity-100 p-1 text-chat-muted hover:text-chat-text rounded transition-all hover:scale-110 shrink-0"
                title="Rename Workspace"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Document Status Pill (Responsive) */}
        {activeDocument && (
          <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 skeuo-pill text-xs text-chat-text truncate max-w-[200px] font-bold shadow-sm">
            <FileText className="w-3.5 h-3.5 text-chat-accent shrink-0" />
            <span className="truncate text-chat-text font-extrabold">{activeDocument.name}</span>
            {activeDocument.status === 'ready' ? (
              <span className="skeuo-led skeuo-led-green animate-pulse-glow" title="Document Ready" />
            ) : (
              <span className="skeuo-led skeuo-led-amber animate-pulse" title="Document Processing" />
            )}
          </div>
        )}
      </div>

      {/* Right: Badges, Theme Selector, LLM Status & Diagnostics */}
      <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
        {/* Theme Selector Control */}
        <ThemeSelector />

        {/* Privacy Pill / Security Audit Trigger */}
        <button
          onClick={onOpenSecurityModal}
          className="skeuo-btn flex items-center space-x-1.5 px-2 sm:px-2.5 py-1.5 text-xs text-emerald-500 font-extrabold"
          title="Click to view Security & Zero-Egress Privacy Audit"
        >
          <Shield className="w-3.5 h-3.5 text-emerald-500" />
          <span className="hidden xl:inline text-chat-text">Zero-Egress</span>
        </button>

        {/* LLM Model Status Button */}
        <button
          onClick={onOpenModelModal}
          className="skeuo-btn flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-2.5 py-1.5 text-xs font-extrabold text-chat-text"
          title="Click to manage local Qwen LLM weights and download status"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
          ) : (
            <span className={`skeuo-led ${isLoaded ? 'skeuo-led-purple animate-pulse-glow' : 'skeuo-led-cyan'}`} />
          )}
          <span className="hidden md:inline">
            {isLoaded ? 'Qwen 2.5' : isLoading ? 'Loading...' : 'Qwen LLM'}
          </span>
        </button>

        {/* Hardware Status Button */}
        <button
          onClick={onOpenHardwareModal}
          className="skeuo-btn flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-2.5 py-1.5 text-xs font-extrabold text-chat-text"
          title="Click to view WebGPU & hardware diagnostics"
        >
          <span className={`skeuo-led ${isOptimal ? 'skeuo-led-green animate-pulse-glow' : 'skeuo-led-amber'}`} />
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden sm:inline font-mono">
            {isOptimal ? 'WebGPU' : 'WASM'}
          </span>
        </button>
      </div>
    </header>
  );
};
