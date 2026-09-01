# Current System Architecture

> **Notice**: This document reflects the **exact, currently implemented** architecture of the codebase. It is updated incrementally at each development phase.

---

## High-Level Overview (Current State: Phase 11)

The application provides end-to-end client-side RAG accelerated with WebGPU compute shaders, automatic shader pre-warming, real-time performance telemetry (TTFT, tokens/sec), GPU benchmarking, and graceful fallback to WebAssembly SIMD.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 BROWSER APPLICATION                                    │
│                                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │                            REACT 18 UI LAYER (Main Thread)                       │  │
│  │                                                                                  │  │
│  │  ┌─────────────────┐  ┌───────────────────────────────────────────────────────┐  │  │
│  │  │  Sidebar        │  │  Header                                               │  │  │
│  │  │  - Brand title  │  │  - Session title + rename inline                      │  │  │
│  │  │  - New Session  │  │  - Document status pill                               │  │  │
│  │  │  - Session list │  │  - Qwen Model Status Badge                            │  │  │
│  │  │  - Storage btn  │  │  - WebGPU hardware status badge                       │  │  │
│  │  └─────────────────┘  └───────────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────────────────────────────────┐  │  │
│  │  │  features/sessions/SessionWorkspace                                        │  │  │
│  │  │  • DocumentDropzone (Parse -> Chunk -> Embed)                              │  │  │
│  │  │  • DocumentCard (Page Inspector, Chunk Inspector, Search Lab)              │  │  │
│  │  │  • ChatMessageItem (Citations [1: p.1] + Telemetry: 28.4 tok/s • TTFT 140ms)│  │  │
│  │  │  • HardwareModal (GPU Benchmark Runner • 64-token speed test)              │  │  │
│  │  │  • Modals: ModelManagerModal, SemanticSearchModal, StorageModal            │  │  │
│  │  └──────────────────────────────────────┬─────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────┼────────────────────────────────────────┘  │
│                                            │ Query Dispatch                            │
│                                            ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │                            ai/rag/ragCoordinator.ts                              │  │
│  │                                                                                  │  │
│  │  • Scoped Vector Retrieval -> Prompt Assembly -> WebGPU Generation -> Telemetry   │  │
│  └─────────────────────────────────────────┬────────────────────────────────────────┘  │
│                                            │                                           │
│                     ┌──────────────────────┴──────────────────────┐                    │
│                     ▼                                             ▼                    │
│  ┌──────────────────────────────────────┐   ┌──────────────────────────────────────┐  │
│  │       EMBEDDING WEB WORKER           │   │      OPTIMIZED LLM WEB WORKER        │  │
│  │ ──────────────────────────────────── │   │ ──────────────────────────────────── │  │
│  │ • workers/embedding.worker.ts        │   │ • workers/llm.worker.ts              │  │
│  │ • Xenova/bge-small-en-v1.5           │   │ • Qwen 2.5 (4-bit q4 WebGPU)         │  │
│  │ • 384-dim Vector Generation          │   │ • 1-Token WGSL Shader Warmup Pass    │  │
│  │ • Mean Pooling + L2 Normalization    │   │ • Live Telemetry (TTFT & Tokens/sec) │  │
│  │ • CacheStorage Model Caching         │   │ • Graceful WASM Fallback on GPU Loss │  │
│  └──────────────────────────────────────┘   └──────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure (Current Actual Layout)

```
document-ai/
│
├── src/
│   ├── app/
│   │   └── App.tsx                       # Root application coordinator
│   │
│   ├── components/
│   │   ├── Header.tsx                    # Header with session rename, Qwen status badge & WebGPU badge
│   │   ├── Sidebar.tsx                   # Collapsible sidebar with Storage manager trigger
│   │   ├── HardwareModal.tsx             # Hardware specs & live GPU speed benchmark runner
│   │   ├── ModelManagerModal.tsx         # Qwen model download progress, quantization & memory modal
│   │   ├── StorageModal.tsx              # Storage quota gauge, persistence & JSON backup
│   │   └── Layout.tsx                    # Main app layout container
│   │
│   ├── features/
│   │   ├── sessions/
│   │   │   ├── SessionWorkspace.tsx      # Dynamic workspace (dropzone vs chat)
│   │   │   ├── types.ts                  # Domain types with GenerationMetrics
│   │   │   └── useSessions.ts            # Reactive session state management hook
│   │   ├── documents/
│   │   │   ├── DocumentDropzone.tsx      # Drag & drop upload area with parsing/embedding progress
│   │   │   ├── DocumentCard.tsx          # Active document card + Search Lab trigger
│   │   │   ├── ChunkInspectorModal.tsx   # Interactive chunk search & 384-dim vector viewer
│   │   │   └── useDocumentUpload.ts      # Pipeline: Parse -> Chunk -> Embed -> Save to DB
│   │   ├── chat/
│   │   │   ├── GroundedTextRenderer.tsx  # Dynamic inline citation parser & interactive pills
│   │   │   ├── ChatContainer.tsx         # Message feed with auto-scroll
│   │   │   ├── ChatMessageItem.tsx       # Message item with citations & WebGPU performance metrics
│   │   │   └── ChatInput.tsx             # Auto-resizing composer + Stop generation button
│   │   └── sources/
│   │       ├── SourcePreviewModal.tsx    # Detailed citation preview modal with copy excerpt
│   │       └── SemanticSearchModal.tsx   # Interactive vector retrieval test lab
│   │
│   ├── documents/
│   │   ├── metadata/
│   │   │   └── tokenEstimator.ts         # BPE token approximation utility
│   │   ├── chunking/
│   │   │   ├── types.ts                  # Chunking options & metadata interfaces
│   │   │   ├── recursiveChunker.ts       # Recursive character splitter algorithm
│   │   │   └── index.ts                  # Document-to-chunks orchestrator
│   │   └── parsers/
│   │       ├── types.ts                  # ParsedDocument, ParsedPage interfaces
│   │       ├── pdfParser.ts              # pdfjs-dist page-by-page extractor
│   │       ├── textParser.ts             # Plain text & Markdown parser
│   │       └── index.ts                  # Parser factory & dispatcher
│   │
│   ├── ai/
│   │   ├── rag/
│   │   │   ├── types.ts                  # RAG request, response, and stage lifecycle types
│   │   │   ├── ragCoordinator.ts         # Master RAG pipeline orchestrator with telemetry
│   │   │   ├── useRAG.ts                 # React hook for RAG status
│   │   │   └── index.ts                  # RAG public API
│   │   ├── prompts/
│   │   │   ├── systemPrompts.ts          # Strict anti-hallucination system prompt with citation rules
│   │   │   ├── groundedPrompt.ts         # ChatML prompt context formatter
│   │   │   └── index.ts                  # Prompts public API
│   │   ├── inference/
│   │   │   ├── types.ts                  # LLM configuration, GenerationMetrics & supported Qwen models
│   │   │   ├── llmService.ts             # Client coordinator managing LLM worker, benchmarks & telemetry
│   │   │   ├── useLLM.ts                 # React hook for model loading, generation & benchmark
│   │   │   └── index.ts                  # Inference public API
│   │   ├── retrieval/
│   │   │   ├── similarity.ts             # Fast dot product & cosine math
│   │   │   ├── types.ts                  # RetrievalOptions, RetrievedChunk interfaces
│   │   │   ├── retriever.ts              # In-browser semantic vector retrieval engine
│   │   │   └── index.ts                  # Retrieval public API
│   │   ├── embeddings/
│   │   │   ├── types.ts                  # Worker message contracts & progress types
│   │   │   ├── embeddingService.ts       # Client coordinator managing worker lifecycle & promises
│   │   │   ├── useEmbedding.ts           # React hook for embedding status & triggers
│   │   │   └── index.ts                  # Embedding public API
│   │   └── models/
│   │       ├── detector.ts               # WebGPU and WASM SIMD capability detector
│   │       ├── types.ts                  # Hardware metrics & limits types
│   │       └── useHardware.ts            # Hardware state subscription hook
│   │
│   ├── storage/
│   │   ├── db.ts                         # Dexie.js IndexedDB schema definition
│   │   ├── types.ts                      # StorageQuotaInfo, BackupData types
│   │   ├── repositories/
│   │   │   ├── sessionRepository.ts      # Session CRUD with cascading delete
│   │   │   ├── documentRepository.ts     # Document attachment & page storage
│   │   │   ├── chunkRepository.ts        # Chunks and vector embedding storage
│   │   │   └── messageRepository.ts      # Chat message history
│   │   ├── quotaService.ts               # Disk quota estimation & persist API
│   │   ├── backupService.ts              # JSON export and import engine
│   │   └── index.ts                      # Storage public API
│   │
│   ├── workers/
│   │   ├── embedding.worker.ts           # Dedicated Web Worker running Transformers.js embedding
│   │   └── llm.worker.ts                 # Dedicated Web Worker running Qwen2.5 WebGPU SLM with warmup
│   │
│   ├── utils/
│   ├── index.css
│   └── main.tsx
│
├── public/
├── models/
├── scripts/
├── docs/
└── package.json
```
