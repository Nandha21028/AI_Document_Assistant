import Dexie, { type Table } from 'dexie';
import type { Session, DocumentRecord, DocumentChunk, ChatMessage } from '../features/sessions/types';

export class AssistantDatabase extends Dexie {
  sessions!: Table<Session, string>;
  documents!: Table<DocumentRecord, string>;
  chunks!: Table<DocumentChunk, string>;
  messages!: Table<ChatMessage, string>;

  constructor() {
    super('ClientAIDocumentAssistantDB');

    // Schema definition: Primary keys and indexed fields
    this.version(1).stores({
      sessions: 'id, createdAt, updatedAt',
      documents: 'id, sessionId, status, uploadedAt',
      chunks: 'id, sessionId, documentId, pageNumber, chunkIndex',
      messages: 'id, sessionId, timestamp, role',
    });
  }
}

export const db = new AssistantDatabase();
