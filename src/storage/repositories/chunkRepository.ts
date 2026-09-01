import { db } from '../db';
import type { DocumentChunk } from '../../features/sessions/types';

export const chunkRepository = {
  async saveChunks(chunks: DocumentChunk[]): Promise<void> {
    if (chunks.length === 0) return;
    await db.chunks.bulkAdd(chunks);
  },

  async getBySessionId(sessionId: string): Promise<DocumentChunk[]> {
    return await db.chunks.where('sessionId').equals(sessionId).sortBy('chunkIndex');
  },

  async getByDocumentId(documentId: string): Promise<DocumentChunk[]> {
    return await db.chunks.where('documentId').equals(documentId).sortBy('chunkIndex');
  },

  async countBySessionId(sessionId: string): Promise<number> {
    return await db.chunks.where('sessionId').equals(sessionId).count();
  },

  async getAll(): Promise<DocumentChunk[]> {
    return await db.chunks.toArray();
  },

  async deleteBySessionId(sessionId: string): Promise<void> {
    await db.chunks.where('sessionId').equals(sessionId).delete();
  },
};
