import { db } from './db';
import type { BackupData } from './types';
import { sessionRepository } from './repositories/sessionRepository';
import { documentRepository } from './repositories/documentRepository';
import { chunkRepository } from './repositories/chunkRepository';
import { messageRepository } from './repositories/messageRepository';

export const backupService = {
  /**
   * Exports all IndexedDB workspaces, documents, chunks, and chat history into a downloadable JSON file.
   */
  async exportBackup(): Promise<void> {
    const [sessions, documents, chunks, messages] = await Promise.all([
      sessionRepository.getAll(),
      documentRepository.getAll(),
      chunkRepository.getAll(),
      messageRepository.getAll(),
    ]);

    const backup: BackupData = {
      version: 1,
      exportedAt: Date.now(),
      sessions,
      documents,
      chunks,
      messages,
    };

    const jsonString = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const dateStr = new Date().toISOString().split('T')[0];
    const link = document.createElement('a');
    link.href = url;
    link.download = `docassistant-backup-${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Imports workspaces, documents, and messages from a JSON backup file.
   */
  async importBackup(file: File): Promise<{ sessionsImported: number }> {
    const text = await file.text();
    const data: BackupData = JSON.parse(text);

    if (!data.sessions || !Array.isArray(data.sessions)) {
      throw new Error('Invalid backup file format: Missing sessions array.');
    }

    await db.transaction('rw', [db.sessions, db.documents, db.chunks, db.messages], async () => {
      if (data.sessions.length > 0) {
        await db.sessions.bulkPut(data.sessions);
      }
      if (data.documents && data.documents.length > 0) {
        await db.documents.bulkPut(data.documents);
      }
      if (data.chunks && data.chunks.length > 0) {
        await db.chunks.bulkPut(data.chunks);
      }
      if (data.messages && data.messages.length > 0) {
        await db.messages.bulkPut(data.messages);
      }
    });

    return { sessionsImported: data.sessions.length };
  },
};
