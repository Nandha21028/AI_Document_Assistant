import { useState } from 'react';
import { parseDocument } from '../../documents/parsers';
import type { ParsedDocument, ParsedPage } from '../../documents/parsers/types';
import { chunkParsedDocument } from '../../documents/chunking';
import { documentRepository, chunkRepository } from '../../storage';
import { embeddingService } from '../../ai/embeddings';
import type { DocumentRecord, DocumentChunk } from '../sessions/types';

export function useDocumentUpload() {
  const [isParsing, setIsParsing] = useState(false);
  const [parsingProgress, setParsingProgress] = useState<{
    currentPage: number;
    totalPages: number;
    status: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [parsedPages, setParsedPages] = useState<ParsedPage[]>([]);
  const [documentChunks, setDocumentChunks] = useState<DocumentChunk[]>([]);

  const uploadAndParse = async (
    file: File,
    sessionId: string
  ): Promise<{ document: DocumentRecord; chunks: DocumentChunk[] } | null> => {
    try {
      setIsParsing(true);
      setErrorMessage(null);

      // 1. Client-side page-by-page parsing
      setParsingProgress({ currentPage: 0, totalPages: 1, status: 'Parsing document in browser memory...' });
      const parsed: ParsedDocument = await parseDocument(file, (progress) => {
        setParsingProgress(progress);
      });

      setParsedPages(parsed.pages);

      // 2. Attach document record to session
      const docRecord: Omit<DocumentRecord, 'sessionId'> = {
        id: parsed.id,
        name: parsed.name,
        size: parsed.size,
        type: parsed.type,
        pageCount: parsed.pageCount,
        uploadedAt: Date.now(),
        status: 'ready',
      };

      const savedDoc = await documentRepository.attachToSession(sessionId, docRecord);

      // 3. Recursive text chunking with metadata
      setParsingProgress({
        currentPage: parsed.pageCount,
        totalPages: parsed.pageCount,
        status: 'Chunking document into semantic blocks...',
      });

      const chunks = chunkParsedDocument(parsed, sessionId);

      // 4. In-Browser Vector Embedding Generation (via Web Worker & WebGPU/WASM)
      setParsingProgress({
        currentPage: 0,
        totalPages: chunks.length,
        status: 'Generating 384-dimensional vector embeddings...',
      });

      const textsToEmbed = chunks.map((c) => c.text);
      const embeddings = await embeddingService.embedChunks(textsToEmbed, (embProgress) => {
        setParsingProgress({
          currentPage: embProgress.current,
          totalPages: embProgress.total,
          status: `Embedding chunk ${embProgress.current} of ${embProgress.total} (${embProgress.percentage}%)...`,
        });
      });

      // Attach embeddings to chunks
      for (let i = 0; i < chunks.length; i++) {
        if (embeddings[i]) {
          chunks[i].embedding = embeddings[i];
        }
      }

      // Save chunks with embeddings to IndexedDB
      await chunkRepository.saveChunks(chunks);
      setDocumentChunks(chunks);

      return { document: savedDoc, chunks };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to parse and embed document.';
      setErrorMessage(msg);
      console.error('Document processing error:', err);
      return null;
    } finally {
      setIsParsing(false);
      setParsingProgress(null);
    }
  };

  const attachSampleDocument = async (
    sessionId: string
  ): Promise<{ document: DocumentRecord; chunks: DocumentChunk[] }> => {
    setIsParsing(true);
    setErrorMessage(null);
    setParsingProgress({ currentPage: 0, totalPages: 3, status: 'Loading sample report...' });

    const samplePages: ParsedPage[] = [
      {
        pageNumber: 1,
        text: 'Acme Corporation - Annual Financial Report 2025\n\n1. Executive Summary\nAcme Corporation achieved record gross revenue of $142.5 million in fiscal year 2025, representing a 28% year-over-year increase compared to $111.3 million in 2024. Operating margin expanded by 340 basis points to 22.4%, driven by strong adoption of our enterprise AI platform. Net income reached $32.0 million with a diluted EPS of $2.45.',
      },
      {
        pageNumber: 2,
        text: '2. Product & Engineering Performance\nOur flagship product DocAssistant reached 450,000 active enterprise seats. Research and Development expenses were $31.2 million, focused on local WebGPU browser inference models and privacy-preserving client-side RAG pipelines with zero cloud data transmission. Customer retention rate remained world-class at 96.8%.',
      },
      {
        pageNumber: 3,
        text: '3. Financial Outlook for 2026\nFor fiscal year 2026, Acme anticipates total revenue between $175 million and $185 million. Capital expenditures are projected at $12 million. The company remains cash-flow positive with zero outstanding long-term debt, and total liquid cash reserves standing at $58.4 million.',
      },
    ];

    setParsedPages(samplePages);

    const parsedDoc: ParsedDocument = {
      id: crypto.randomUUID(),
      name: 'Acme_Financial_Report_2025.pdf',
      size: 184320,
      type: 'application/pdf',
      pageCount: 3,
      pages: samplePages,
      fullText: samplePages.map((p) => p.text).join('\n\n'),
    };

    const docRecord: Omit<DocumentRecord, 'sessionId'> = {
      id: parsedDoc.id,
      name: parsedDoc.name,
      size: parsedDoc.size,
      type: parsedDoc.type,
      pageCount: parsedDoc.pageCount,
      uploadedAt: Date.now(),
      status: 'ready',
    };

    const savedDoc = await documentRepository.attachToSession(sessionId, docRecord);
    const chunks = chunkParsedDocument(parsedDoc, sessionId);

    // Embed sample chunks
    setParsingProgress({ currentPage: 0, totalPages: chunks.length, status: 'Computing vector embeddings for sample chunks...' });
    const textsToEmbed = chunks.map((c) => c.text);
    const embeddings = await embeddingService.embedChunks(textsToEmbed);

    for (let i = 0; i < chunks.length; i++) {
      if (embeddings[i]) {
        chunks[i].embedding = embeddings[i];
      }
    }

    await chunkRepository.saveChunks(chunks);
    setDocumentChunks(chunks);

    setIsParsing(false);
    setParsingProgress(null);
    return { document: savedDoc, chunks };
  };

  const loadChunksForSession = async (sessionId: string) => {
    const chunks = await chunkRepository.getBySessionId(sessionId);
    setDocumentChunks(chunks);
    return chunks;
  };

  return {
    isParsing,
    parsingProgress,
    errorMessage,
    parsedPages,
    documentChunks,
    uploadAndParse,
    attachSampleDocument,
    loadChunksForSession,
    setDocumentChunks,
    clearError: () => setErrorMessage(null),
  };
}
