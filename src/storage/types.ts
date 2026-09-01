import type { Session, DocumentRecord, DocumentChunk, ChatMessage } from '../features/sessions/types';

export interface StorageQuotaInfo {
  usageBytes: number;
  quotaBytes: number;
  usagePercentage: number;
  isPersistent: boolean;
}

export interface BackupData {
  version: number;
  exportedAt: number;
  sessions: Session[];
  documents: DocumentRecord[];
  chunks: DocumentChunk[];
  messages: ChatMessage[];
}
