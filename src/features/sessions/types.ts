import type { GenerationMetrics } from '../../ai/inference/types';

export interface Session {
  id: string;             // Unique UUID
  title: string;          // Session title (e.g. "Q3 Financials Analysis")
  createdAt: number;      // Unix timestamp
  updatedAt: number;      // Unix timestamp
  documentId?: string;    // ID of the primary document attached to this session
}

export interface DocumentRecord {
  id: string;             // Unique document ID
  sessionId: string;      // Foreign key -> Session.id (Strict Isolation)
  name: string;           // File name (e.g. "report.pdf")
  size: number;           // File size in bytes
  type: string;           // MIME type (application/pdf, text/plain, etc.)
  pageCount: number;      // Number of pages (if PDF) or 1 (if plain text)
  uploadedAt: number;     // Unix timestamp
  status: 'parsing' | 'chunking' | 'embedding' | 'ready' | 'error';
  errorMessage?: string;
}

export interface DocumentChunk {
  id: string;             // Unique chunk ID: `${documentId}_chunk_${index}`
  sessionId: string;      // Foreign key -> Session.id (Strict Isolation)
  documentId: string;     // Foreign key -> DocumentRecord.id
  documentName: string;   // Cached document name for easy source rendering
  chunkIndex: number;     // Sequential index
  pageNumber?: number;    // Page number if available (1-based)
  sectionTitle?: string;  // Detected section heading if available
  text: string;           // Chunk textual content
  tokenCount: number;     // Estimated or tokenized length
  embedding?: number[];   // Vector embedding (e.g., 384-dim for MiniLM/BGE)
}

export interface SourceReference {
  chunkId: string;
  documentName: string;
  pageNumber?: number;
  sectionTitle?: string;
  snippet: string;
  similarityScore: number; // Cosine similarity score [0.0 - 1.0]
}

export interface ChatMessage {
  id: string;
  sessionId: string;      // Foreign key -> Session.id (Strict Isolation)
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  sources?: SourceReference[]; // Source citations attached to the assistant answer
  isStreaming?: boolean;
  metrics?: GenerationMetrics; // WebGPU generation performance metrics
}
