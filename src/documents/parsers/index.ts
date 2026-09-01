import { parsePdfDocument } from './pdfParser';
import { parseTextDocument } from './textParser';
import { parseCsvDocument } from './csvParser';
import { parseExcelDocument } from './excelParser';
import type { ParsedDocument, ParseProgressCallback } from './types';

export * from './types';
export * from './pdfParser';
export * from './textParser';
export * from './csvParser';
export * from './excelParser';

/**
 * Universal client-side document parser.
 * Inspects file MIME type and extension to dispatch to the appropriate parser.
 */
export async function parseDocument(
  file: File,
  onProgress?: ParseProgressCallback
): Promise<ParsedDocument> {
  const fileName = file.name.toLowerCase();

  // 1. PDF Documents
  if (file.type === 'application/pdf' || fileName.endsWith('.pdf')) {
    return await parsePdfDocument(file, onProgress);
  }

  // 2. Excel Spreadsheets (.xlsx, .xls, .xlsm, .xlsb)
  if (
    fileName.endsWith('.xlsx') ||
    fileName.endsWith('.xls') ||
    fileName.endsWith('.xlsm') ||
    fileName.endsWith('.xlsb') ||
    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.type === 'application/vnd.ms-excel' ||
    file.type === 'application/msexcel' ||
    file.type === 'application/x-msexcel'
  ) {
    return await parseExcelDocument(file, onProgress);
  }

  // 3. CSV & Tabular Plaintext (.csv, .tsv)
  if (
    fileName.endsWith('.csv') ||
    fileName.endsWith('.tsv') ||
    file.type === 'text/csv' ||
    file.type === 'text/tab-separated-values'
  ) {
    return await parseCsvDocument(file, onProgress);
  }

  // 4. Plain Text, Markdown, JSON
  if (
    fileName.endsWith('.txt') ||
    fileName.endsWith('.md') ||
    fileName.endsWith('.markdown') ||
    fileName.endsWith('.json') ||
    file.type.startsWith('text/')
  ) {
    return await parseTextDocument(file, onProgress);
  }

  throw new Error(
    `Unsupported file type: ${file.name}. Please upload a PDF, Excel (.xlsx, .xls), CSV, Markdown (.md), TXT, or JSON document.`
  );
}
