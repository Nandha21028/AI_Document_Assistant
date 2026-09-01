import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { HardwareModal } from './HardwareModal';
import { StorageModal } from './StorageModal';
import { ModelManagerModal } from './ModelManagerModal';
import { SecurityModal } from './SecurityModal';
import type { Session, DocumentRecord } from '../features/sessions/types';
import type { HardwareCapability } from '../ai/models/types';

interface LayoutProps {
  sessions: Session[];
  activeSession: Session | null;
  activeSessionId: string | null;
  activeDocument: DocumentRecord | null;
  capability: HardwareCapability | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onDataChanged: () => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  sessions,
  activeSession,
  activeSessionId,
  activeDocument,
  capability,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onRenameSession,
  onDataChanged,
  children,
}) => {
  // On desktop, default to open; on mobile (<768px), default to closed
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });

  // Track window resize to manage responsive states
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && isSidebarOpen) {
        // keep mobile drawer state managed by user
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarOpen]);

  const [isHardwareModalOpen, setIsHardwareModalOpen] = useState(false);
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);

  const handleSelectSession = (id: string) => {
    onSelectSession(id);
    // Auto-close sidebar drawer on mobile upon selection
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleNewSession = () => {
    onNewSession();
    // Auto-close sidebar drawer on mobile upon creating new session
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="flex h-screen w-screen h-[100dvh] overflow-hidden bg-chat-bg text-chat-text relative">
      {/* Mobile Drawer Backdrop Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden transition-opacity animate-in fade-in duration-200"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar (Responsive Drawer on Mobile, Collapsible on Desktop) */}
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        isOpen={isSidebarOpen}
        onToggleOpen={() => setIsSidebarOpen(!isSidebarOpen)}
        onClose={() => setIsSidebarOpen(false)}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onDeleteSession={onDeleteSession}
        onOpenStorageModal={() => setIsStorageModalOpen(true)}
      />

      {/* Main App Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        <Header
          activeSession={activeSession}
          activeDocument={activeDocument}
          capability={capability}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenHardwareModal={() => setIsHardwareModalOpen(true)}
          onOpenModelModal={() => setIsModelModalOpen(true)}
          onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
          onRenameSession={onRenameSession}
        />

        <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          {children}
        </main>
      </div>

      {/* Modal Dialogs */}
      <HardwareModal
        isOpen={isHardwareModalOpen}
        onClose={() => setIsHardwareModalOpen(false)}
        capability={capability}
      />

      <StorageModal
        isOpen={isStorageModalOpen}
        onClose={() => setIsStorageModalOpen(false)}
        onDataChanged={onDataChanged}
      />

      <ModelManagerModal
        isOpen={isModelModalOpen}
        onClose={() => setIsModelModalOpen(false)}
      />

      <SecurityModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
      />
    </div>
  );
};
