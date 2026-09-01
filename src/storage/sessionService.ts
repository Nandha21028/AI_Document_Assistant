import { db } from './db';
import type { Session, DocumentRecord, DocumentChunk, ChatMessage } from '../features/sessions/types';

export const sessionService = {
  /**
   * Create a new isolated chat session
   */
  async createSession(title: string = 'New Document Session'): Promise<Session> {
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

  /**
   * Fetch all sessions sorted by most recent
   */
  async getAllSessions(): Promise<Session[]> {
    return await db.sessions.orderBy('updatedAt').reverse().toArray();
  },

  /**
   * Get a single session by ID
   */
  async getSession(id: string): Promise<Session | undefined> {
    return await db.sessions.get(id);
  },

  /**
   * Rename a session title
   */
  async renameSession(id: string, newTitle: string): Promise<void> {
    await db.sessions.update(id, {
      title: newTitle,
      updatedAt: Date.now(),
    });
  },

  /**
   * Completely delete a session and CASCADE delete all its documents, chunks, and messages.
   */
  async deleteSession(sessionId: string): Promise<void> {
    await db.transaction('rw', [db.sessions, db.documents, db.chunks, db.messages], async () => {
      await db.chunks.where('sessionId').equals(sessionId).delete();
      await db.documents.where('sessionId').equals(sessionId).delete();
      await db.messages.where('sessionId').equals(sessionId).delete();
      await db.sessions.delete(sessionId);
    });
  },

  /**
   * Attach a document to a session
   */
  async attachDocument(sessionId: string, doc: Omit<DocumentRecord, 'sessionId'>): Promise<DocumentRecord> {
    const fullDoc: DocumentRecord = {
      ...doc,
      sessionId,
    };

    await db.transaction('rw', [db.sessions, db.documents], async () => {
      await db.documents.where('sessionId').equals(sessionId).delete();
      await db.documents.add(fullDoc);
      await db.sessions.update(sessionId, {
        documentId: fullDoc.id,
        updatedAt: Date.now(),
      });
    });

    return fullDoc;
  },

  /**
   * Get the primary document for a session
   */
  async getDocumentForSession(sessionId: string): Promise<DocumentRecord | undefined> {
    return await db.documents.where('sessionId').equals(sessionId).first();
  },

  /**
   * Save document chunks with embeddings
   */
  async saveChunks(chunks: DocumentChunk[]): Promise<void> {
    if (chunks.length === 0) return;
    await db.chunks.bulkAdd(chunks);
  },

  /**
   * Fetch all chunks belonging to a specific session
   */
  async getChunksForSession(sessionId: string): Promise<DocumentChunk[]> {
    return await db.chunks.where('sessionId').equals(sessionId).toArray();
  },

  /**
   * Add a chat message to a session
   */
  async addMessage(message: ChatMessage): Promise<void> {
    await db.transaction('rw', [db.sessions, db.messages], async () => {
      await db.messages.add(message);
      await db.sessions.update(message.sessionId, {
        updatedAt: Date.now(),
      });
    });
  },

  /**
   * Get all messages for a session ordered by timestamp
   */
  async getMessagesForSession(sessionId: string): Promise<ChatMessage[]> {
    return await db.messages.where('sessionId').equals(sessionId).sortBy('timestamp');
  },

  /**
   * Clear all messages in a session
   */
  async clearMessages(sessionId: string): Promise<void> {
    await db.messages.where('sessionId').equals(sessionId).delete();
  },
};
