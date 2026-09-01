import { db } from '../db';
import type { ChatMessage } from '../../features/sessions/types';

export const messageRepository = {
  async add(message: ChatMessage): Promise<void> {
    await db.transaction('rw', [db.sessions, db.messages], async () => {
      await db.messages.add(message);
      await db.sessions.update(message.sessionId, {
        updatedAt: Date.now(),
      });
    });
  },

  async getBySessionId(sessionId: string): Promise<ChatMessage[]> {
    return await db.messages.where('sessionId').equals(sessionId).sortBy('timestamp');
  },

  async getAll(): Promise<ChatMessage[]> {
    return await db.messages.toArray();
  },

  async clearSession(sessionId: string): Promise<void> {
    await db.messages.where('sessionId').equals(sessionId).delete();
  },
};
