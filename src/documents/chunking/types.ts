export interface ChunkingOptions {
  chunkSize: number;       // Target chunk size in characters (default: 500)
  chunkOverlap: number;    // Character overlap between consecutive chunks (default: 80)
  minChunkSize: number;    // Discard/merge chunks smaller than this threshold (default: 50)
  separators?: string[];   // Hierarchical separator list
}

export interface RawChunk {
  text: string;
  pageNumber?: number;
  sectionTitle?: string;
  tokenCount: number;
}
