import { db } from '../db';
import type { Session } from '../../features/sessions/types';

export const sessionRepository = {
  async create(title: string = 'New Document Session'): Promise<Session> {
    const now = Date.now();
    const session: Session = {
      id: crypto.randomUUID(),
      title,
      createdAt: now,
      updatedAt: now,
    };
    await db.sessions.add(session);
    return session;
  },

  async getAll(): Promise<Session[]> {
    return await db.sessions.orderBy('updatedAt').reverse().toArray();
  },

  async getById(id: string): Promise<Session | undefined> {
    return await db.sessions.get(id);
  },

  async updateTitle(id: string, newTitle: string): Promise<void> {
    await db.sessions.update(id, {
      title: newTitle,
      updatedAt: Date.now(),
    });
  },

  async updateDocumentId(sessionId: string, documentId?: string): Promise<void> {
    await db.sessions.update(sessionId, {
      documentId,
      updatedAt: Date.now(),
    });
  },

  /**
   * Cascading deletion: Removes session and all scoped records (documents, chunks, messages)
   */
  async deleteWithCascade(sessionId: string): Promise<void> {
    await db.transaction('rw', [db.sessions, db.documents, db.chunks, db.messages], async () => {
      await db.chunks.where('sessionId').equals(sessionId).delete();
      await db.documents.where('sessionId').equals(sessionId).delete();
      await db.messages.where('sessionId').equals(sessionId).delete();
      await db.sessions.delete(sessionId);
    });
  },

  async clearAll(): Promise<void> {
    await db.transaction('rw', [db.sessions, db.documents, db.chunks, db.messages], async () => {
      await db.chunks.clear();
      await db.documents.clear();
      await db.messages.clear();
      await db.sessions.clear();
    });
  },
};
