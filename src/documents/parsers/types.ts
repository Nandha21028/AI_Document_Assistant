export interface ParsedPage {
  pageNumber: number;
  text: string;
}

export interface ParsedDocument {
  id: string;
  name: string;
  size: number;
  type: string;
  pageCount: number;
  pages: ParsedPage[];
  fullText: string;
}

export interface ParseProgressCallback {
  (progress: { currentPage: number; totalPages: number; status: string }): void;
}
