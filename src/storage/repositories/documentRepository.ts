import { db } from '../db';
import type { DocumentRecord } from '../../features/sessions/types';

export const documentRepository = {
  async attachToSession(
    sessionId: string,
    doc: Omit<DocumentRecord, 'sessionId'>
  ): Promise<DocumentRecord> {
    const fullDoc: DocumentRecord = {
      ...doc,
      sessionId,
    };

    await db.transaction('rw', [db.sessions, db.documents, db.chunks], async () => {
      // Remove any existing document and chunks for this session
      await db.chunks.where('sessionId').equals(sessionId).delete();
      await db.documents.where('sessionId').equals(sessionId).delete();

      await db.documents.add(fullDoc);
      await db.sessions.update(sessionId, {
        documentId: fullDoc.id,
        updatedAt: Date.now(),
      });
    });

    return fullDoc;
  },

  async getBySessionId(sessionId: string): Promise<DocumentRecord | undefined> {
    return await db.documents.where('sessionId').equals(sessionId).first();
  },

  async getById(id: string): Promise<DocumentRecord | undefined> {
    return await db.documents.get(id);
  },

  async getAll(): Promise<DocumentRecord[]> {
    return await db.documents.toArray();
  },

  async updateStatus(id: string, status: DocumentRecord['status'], errorMessage?: string): Promise<void> {
    await db.documents.update(id, {
      status,
      errorMessage,
    });
  },

  async deleteBySessionId(sessionId: string): Promise<void> {
    await db.transaction('rw', [db.sessions, db.documents, db.chunks], async () => {
      await db.chunks.where('sessionId').equals(sessionId).delete();
      await db.documents.where('sessionId').equals(sessionId).delete();
      await db.sessions.update(sessionId, {
        documentId: undefined,
        updatedAt: Date.now(),
      });
    });
  },
};
