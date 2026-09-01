import React, { useState } from 'react';
import { Plus, MessageSquare, Trash2, ChevronLeft, ChevronRight, Sparkles, Database, Settings, X } from 'lucide-react';
import type { Session } from '../features/sessions/types';
import { ConfirmModal } from './ConfirmModal';

interface SidebarProps {
  sessions: Session[];
  activeSessionId: string | null;
  isOpen: boolean;
  onToggleOpen: () => void;
  onClose?: () => void;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  onOpenStorageModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  activeSessionId,
  isOpen,
  onToggleOpen,
  onClose,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onOpenStorageModal,
}) => {
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);

  const handleConfirmDelete = () => {
    if (sessionToDelete) {
      onDeleteSession(sessionToDelete.id);
      setSessionToDelete(null);
    }
  };

  return (
    <>
      <aside
        className={`flex flex-col h-full bg-chat-sidebar border-r border-chat-border transition-all duration-300 ease-in-out select-none ${
          /* Mobile Drawer: fixed overlay slide-in */
          isOpen
            ? 'fixed inset-y-0 left-0 z-50 w-72 sm:w-80 shadow-2xl md:relative md:shadow-none md:z-30 md:w-64 lg:w-72'
            : 'fixed -translate-x-full md:relative md:translate-x-0 md:w-0 md:border-r-0'
        }`}
      >
        {/* Desktop Collapse/Expand Toggle Tab */}
        <button
          onClick={onToggleOpen}
          className={`hidden md:flex absolute -right-3.5 top-5 z-40 p-1.5 rounded-full skeuo-btn text-chat-muted hover:text-chat-text shadow-md transition-transform ${
            !isOpen ? 'translate-x-3.5' : ''
          }`}
          title={isOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
        >
          {isOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {/* Sidebar Content (Shown when Open) */}
        <div className={`flex flex-col h-full p-3.5 overflow-hidden ${!isOpen ? 'hidden md:hidden' : 'flex'}`}>
          {/* Brand Header */}
          <div className="flex items-center justify-between px-2 py-2 mb-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-chat-well text-chat-accent border border-chat-border shadow-inner">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-chat-text tracking-tight flex items-center space-x-1.5">
                  <span>DocAssistant AI</span>
                  <span className="skeuo-led skeuo-led-green animate-pulse-glow" />
                </h2>
                <span className="text-[10px] text-chat-muted font-mono tracking-wider font-extrabold">
                  100% CLIENT-SIDE RAG
                </span>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={onClose || onToggleOpen}
              className="md:hidden skeuo-btn p-1.5 text-chat-muted hover:text-chat-text"
              title="Close Sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* New Workspace Button */}
          <button
            onClick={onNewSession}
            className="skeuo-btn flex items-center justify-center space-x-2 w-full py-2.5 px-3 font-bold text-xs mb-4 shadow-sm text-chat-text min-h-[44px]"
          >
            <Plus className="w-4 h-4 text-chat-accent" />
            <span>New Document Workspace</span>
          </button>

          {/* Session List Title */}
          <div className="flex items-center justify-between px-2 mb-2 text-[11px] font-black text-chat-muted uppercase tracking-wider">
            <span>Workspaces</span>
            <span className="font-mono text-[11px] skeuo-pill px-2 py-0.5 text-chat-text font-bold">
              {sessions.length}
            </span>
          </div>

          {/* Session List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {sessions.map((session) => {
              const isActive = session.id === activeSessionId;
              return (
                <div
                  key={session.id}
                  onClick={() => onSelectSession(session.id)}
                  className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs transition-all min-h-[44px] ${
                    isActive
                      ? 'skeuo-card bg-chat-card text-chat-text border-chat-accent shadow-md translate-x-0.5 font-bold'
                      : 'text-chat-muted hover:bg-chat-hover hover:text-chat-text border border-transparent font-semibold'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0 pr-6">
                    {isActive ? (
                      <span className="skeuo-led skeuo-led-cyan animate-pulse-glow shrink-0" />
                    ) : (
                      <MessageSquare className="w-4 h-4 shrink-0 text-chat-muted group-hover:text-chat-text" />
                    )}
                    <span className="truncate text-chat-text">{session.title}</span>
                  </div>

                  {sessions.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSessionToDelete(session);
                      }}
                      className="absolute right-2 p-1.5 rounded-md text-chat-muted hover:text-rose-500 opacity-80 md:opacity-0 group-hover:opacity-100 transition-opacity hover:bg-chat-well"
                      title="Delete Workspace"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer Persistence Status & Storage Manager Trigger */}
          <div className="mt-auto pt-3 border-t border-chat-border">
            <button
              onClick={onOpenStorageModal}
              className="skeuo-btn w-full flex items-center justify-between px-3 py-2.5 text-xs font-bold text-chat-text hover:border-chat-accent min-h-[44px]"
              title="Manage IndexedDB Storage & Backups"
            >
              <div className="flex items-center space-x-2 truncate">
                <Database className="w-3.5 h-3.5 text-chat-accent shrink-0" />
                <span className="truncate text-chat-text font-bold">Local DB Storage</span>
              </div>
              <Settings className="w-3.5 h-3.5 text-chat-muted shrink-0" />
            </button>
          </div>
        </div>
      </aside>

      {/* Professional Custom Confirmation Dialog */}
      <ConfirmModal
        isOpen={Boolean(sessionToDelete)}
        title="Delete Workspace"
        message={
          <span>
            Are you sure you want to permanently delete{' '}
            <strong className="text-chat-text font-bold">"{sessionToDelete?.title}"</strong> and all its ingested document chunks? This action cannot be undone.
          </span>
        }
        confirmLabel="Delete Workspace"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setSessionToDelete(null)}
      />
    </>
  );
};
