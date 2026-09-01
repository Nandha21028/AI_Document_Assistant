# Project Overview, Architecture & Codebase Map

> **A Guide for Technical Leads, Seniors & Stakeholders**  
> *Everything you need to understand, demonstrate, and explain this 100% Client-Side AI Document Assistant.*

---

## 1. Executive Summary (The Elevator Pitch)

* **What is this project?**  
  A **100% client-side, zero-server, air-gapped AI Document Assistant**. It parses complex documents (PDFs, Markdown, TXT), splits them into semantic chunks, generates 384-dimensional dense vector embeddings, performs in-memory cosine similarity retrieval, and runs an open-weight Small Language Model (**Qwen 2.5 0.5B / 1.5B**) directly on the user's graphics card using **WebGPU**.

* **Why is this significant?**  
  1. **Zero Data Egress / Total Privacy**: Document text, vectors, and chat history never leave the browser. Zero cloud APIs, zero third-party data transmission.
  2. **Zero Infrastructure Cost**: No cloud servers, no GPU cluster billing, no API tokens. Compute is offloaded entirely to client hardware.
  3. **Offline & Permanent**: Models and databases are cached in browser `CacheStorage` and `IndexedDB`. Once loaded, it operates completely offline.
  4. **Strict Fact Grounding & Citations**: Every claim in the generated response features interactive inline citation pills (`[1: p.1]`) that link directly to verified document excerpts.

---

## 2. High-Level Architecture

The system is structured into **4 decoupled layers**:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   1. PRESENTATION LAYER                                │
│                       React 18 • TypeScript • Tailwind CSS • Lucide                    │
│                                                                                        │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────────────────────┐  │
│  │ Sidebar & Workspace     │  │ Chat & Document Interface                           │  │
│  │ • Multi-Session Manager │  │ • DocumentDropzone (Progress animation)             │  │
│  │ • Cascading Deletion    │  │ • GroundedTextRenderer (Clickable [1: p.1] pills)   │  │
│  │ • Storage Quota Modal   │  │ • Live WebGPU Telemetry Badge (tok/s, TTFT)         │  │
│  │ • Security Audit Modal  │  │ • Interactive Modals (Chunk/Page/Search Labs)       │  │
│  └─────────────────────────┘  └─────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ Dispatches Actions
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              2. ORCHESTRATION & LOGIC LAYER                            │
│                                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │ ragCoordinator.ts (Master RAG State Machine)                                     │  │
│  │  1. Query Preprocessing & Token Sanitization (security.ts)                       │  │
│  │  2. Session-Scoped Vector Search (retriever.ts & similarity.ts)                   │  │
│  │  3. Similarity Threshold Guard (< 0.28 Short-Circuiting to prevent Hallucination)│  │
│  │  4. Grounded ChatML Prompt Assembly (groundedPrompt.ts + systemPrompts.ts)       │  │
│  │  5. Streaming Token Dispatch & Fine-Grained Source Citation Linking              │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────┬────────────────────────────────────────────┬───────────────────┘
                        │ postMessage (Typed Promises)               │ Read / Write
                        ▼                                            ▼
┌──────────────────────────────────────────────────┐   ┌─────────────────────────────────┐
│              3. AI COMPUTE LAYER                 │   │      4. LOCAL STORAGE LAYER     │
│       (Isolated Background OS Workers)           │   │      (IndexedDB via Dexie.js)   │
│                                                  │   │                                 │
│ ┌──────────────────────────────────────────────┐ │   │ • sessions Table (Workspace ID) │
│ │ embedding.worker.ts                          │ │   │ • documents Table (Metadata)    │
│ │ • Xenova/bge-small-en-v1.5                   │ │   │ • chunks Table (384-dim Vectors)│
│ │ • Mean Pooling + L2 Normalization (||v||=1)  │ │   │ • messages Table (Chat History) │
│ └──────────────────────────────────────────────┘ │   │ • Quota & JSON Backup Services  │
│ ┌──────────────────────────────────────────────┐ │   └─────────────────────────────────┘
│ │ llm.worker.ts                                │ │
│ │ • onnx-community/Qwen2.5-0.5B-Instruct (q4)  │ │
│ │ • WebGPU Compute Shaders (WASM SIMD Fallback)│ │
│ │ • 1-Token WGSL Shader Warmup Pass            │ │
│ │ • TextStreamer Real-Time Token Generation    │ │
│ └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

---

## 3. End-to-End Execution Flows

### Flow A: Document Ingestion Pipeline (File $\rightarrow$ Searchable Vectors)

```
1. User drops PDF/TXT/MD file into DocumentDropzone.tsx
   │
2. parseDocument() dispatcher chooses parser:
   ├─► pdfParser.ts: Uses pdfjs-dist to extract structured text page-by-page in RAM.
   └─► textParser.ts: Reads plain text / Markdown.
   │
3. chunkParsedDocument() (recursiveChunker.ts):
   • Recursively splits text into ~500 character chunks with 80 character sliding overlap.
   • Preserves complete sentences and paragraphs.
   • Extracts Markdown # Headings & numbered sections.
   • Attaches pageNumber (1-based) and tokenCount (tokenEstimator.ts).
   │
4. embeddingService.embedChunks() (embedding.worker.ts):
   • Background worker passes chunk strings through bge-small-en-v1.5.
   • Performs Mean Pooling and L2 Normalization.
   • Returns Float32Array[384] per chunk.
   │
5. chunkRepository.saveChunks():
   • Persists chunk text, metadata, and 384-dim vectors into IndexedDB under sessionId.
```

---

### Flow B: User Query & Grounded Answer Pipeline (Question $\rightarrow$ Verified Answer)

```
1. User types question in ChatInput.tsx (e.g. "What was Acme's 2025 revenue?")
   │
2. useSessions.ts routes query to ragCoordinator.execute()
   │
3. embeddingService.embedQuery():
   • Converts query into a 384-dimensional unit vector.
   │
4. retriever.retrieve() (similarity.ts):
   • Queries IndexedDB strictly for chunks where sessionId === activeSessionId.
   • Computes dot product: Score = dot(queryVector, chunkVector).
   • Filters out chunks with score < 0.28.
   • Ranks by similarity descending and takes Top-3 chunks.
   │
5. Anti-Hallucination Check:
   • If 0 chunks pass threshold, instantly returns "Information not found in document" without running LLM.
   │
6. buildGroundedPrompt() (groundedPrompt.ts):
   • Sanitizes inputs against prompt injection (security.ts).
   • Formats context blocks: [Source 1: Document.pdf (Page 1 - Executive Summary)]
   • Appends strict negative constraints and mandatory [1] citation rules in ChatML format.
   │
7. llmService.generateStream() (llm.worker.ts):
   • Dispatches prompt to Qwen 2.5 on WebGPU.
   • TextStreamer emits tokens in real time.
   │
8. UI Renders:
   • GroundedTextRenderer.tsx parses [1] into clickable [1: p.1] pill buttons.
   • Displays telemetry badge: ⚡ 28.4 tok/s • TTFT: 140ms • WEBGPU.
   • Clicking any citation pill opens SourcePreviewModal.tsx to inspect the exact source page.
```

---

## 4. File-by-File Contribution Map

Below is a complete breakdown of every file in the codebase, grouped by responsibility:

### 1. Document Ingestion Layer (`src/documents/`)

| File Path | Role & What It Does | Why It Exists |
| :--- | :--- | :--- |
| [`parsers/types.ts`](file:///c:/Nandha/RND/Self/Document_Assistant/src/documents/parsers/types.ts) | Defines `ParsedDocument` and `ParsedPage` interfaces. | Establishes the data contract for all file parsers. |
| [`parsers/pdfParser.ts`](file:///c:/Nandha/RND/Self/Document_Assistant/src/documents/parsers/pdfParser.ts) | Uses `pdfjs-dist` to extract structured text page-by-page. | Enables client-side PDF reading without cloud conversion. |
| [`parsers/textParser.ts`](file:///c:/Nandha/RND/Self/Document_Assistant/src/documents/parsers/textParser.ts) | Parses TXT, Markdown, CSV, and JSON files. | Supports universal textual formats with logical page breaks. |
| [`parsers/index.ts`](file:///c:/Nandha/RND/Self/Document_Assistant/src/documents/parsers/index.ts) | Parser dispatcher and MIME-type validator. | Single entry point: routes files to the correct parser. |
| [`chunking/types.ts`](file:///c:/Nandha/RND/Self/Document_Assistant/src/documents/chunking/types.ts) | Interfaces for chunking configuration and metadata. | Configures chunk size, overlap, and separator hierarchies. |
| [`chunking/recursiveChunker.ts`](file:///c:/Nandha/RND/Self/Document_Assistant/src/documents/chunking/recursiveChunker.ts) | Hierarchical text splitter algorithm (500c / 80o). | Prevents cutting sentences in half; detects section titles. |
| [`chunking/index.ts`](file:///c:/Nandha/RND/Self/Document_Assistant/src/documents/chunking/index.ts) | Document chunking orchestrator. | Iterates over parsed pages and builds enriched `DocumentChunk`s. |
| [`metadata/tokenEstimator.ts`](file:///c:/Nandha/RND/Self/Document_Assistant/src/documents/metadata/tokenEstimator.ts) | Fast client-side BPE token counter. | Ensures chunks stay within the SLM's context window budget. |

---

### 2. AI & Retrieval Layer (`src/ai/`)

| File Path | Role & What It Does | Why It Exists |
| :--- | :--- | :--- |
| [`embeddings/types.ts`](file:///c:/Nandha/RND/Self/Document_Assistant/src/ai/embeddings/types.ts) | Message protocol types for the embedding worker. | Type-safe communication between UI and background worker. |
| [`embeddings/embeddingService.ts`](file:///c:/Nandha/RND/Self/Document_Assistant/src/ai/embeddings/embeddingService.ts) | Singleton manager coordinating embedding promises. | Translates worker messages into clean `async/await` methods. |
| [`embeddings/useEmbedding.ts`](file:///c:/Nandha/RND/Self/Document_Assistant/src/ai/embeddings/useEmbedding.ts) | React hook exposing model readiness and progress. | Allows UI components to reactively display embedding progress. |
| [`retrieval/similarity.ts`](file:///c:/Nandha/RND/Self/Document_Assistant/src/ai/retrieval/similarity.ts) | Fast dot product & cosine similarity math. | Computes vector alignment in $< 2\text{ms}$ across hundreds of chunks. |
| [`retrieval/types.ts`](file:///c:/Nandha/RND/Self/Document_Assistant/src/ai/retrieval/types.ts) | Interfaces for `RetrievalOptions` and `RetrievedChunk`. | Standardizes retrieval results with similarity scores and ranks. |
| [`retrieval/retriever.ts`](file:///c:/Nandha/RND/Self/Document_Assistant/src/ai/retrieval/retriever.ts) | Session-scoped vector retrieval and top-$K$ ranker. | Finds the 3 most relevant passages for any user question. |
| [`inference/types.ts`](file:///c:/Nandha/RND/Self/Document_Assistant/src/ai/inference/types.ts) | LLM configuration, `GenerationMetrics`, model list. | Defines parameters (`temperature: 0.2`, `maxTokens: 512`). |
| [`inference/llmService.ts`](file:///c:/Nandha/RND/Self/Document_Assistant/src/ai/inference/llmService.ts) | Bridge to the LLM worker; manages token streaming. | Manages model loading, abort signals, and GPU benchmarks. |
| [`inference/useLLM.ts`](file:///c:/Nandha/RND/Self/Document_Assistant/src/ai/inference/useLLM.ts) | React hook for LLM status, download %, generation. | Connects React chat components to the local Qwen model. |
| [`prompts/systemPrompts.ts`](file:///c:/Nandha/RND/Self/Document_Assistant/src/ai/prompts/systemPrompts.ts) | Strict negative constraints and `[1]` citation rules. | Commands the AI to answer only from context and never guess. |
| [`prompts/groundedPrompt.ts`](file:///c:/Nandha/RND/Self/Document_Assistant/src/ai/prompts/groundedPrompt.ts) | Assembles context blocks into Qwen ChatML template. | Formats prompt: `<\|im_start\|>system... context... user...` |
| [`rag/types.ts`](file:///c:/Nandha/RND/Self/Document_Assistant/src/ai/rag/types.ts) | RAG request, response, and stage lifecycle types. | Tracks stages: `retrieving` $\rightarrow$ `generating` $\rightarrow$ `completed`. |
| [`rag/ragCoordinator.ts`](file:///c:/Nandha/RND/Self/Document_Assistant/src/ai/rag/ragCoordinator.ts) | Master RAG pipeline orchestrator. | Coordinates retrieval, guardrails, context assembly, and streaming. |
| [`rag/useRAG.ts`](file:///c:/Nandha/RND/Self/Document_Assistant/src/ai/rag/useRAG.ts) | React hook for RAG execution state. | Exposes pipeline status messages to the chat interface. |
| [`models/detector.ts`](file:///c:/Nandha/RND/Self/Document_Assistant/src/ai/models/detector.ts) | Queries `navigator.gpu` and WASM SIMD limits. | Diagnoses user graphics hardware and max buffer sizes. |
| [`models/useHardware.ts`](file:///c:/Nandha/RND/Self/Document_Assistant/src/ai/models/useHardware.ts) | React hook for hardware diagnostics. | Supplies hardware readiness status to the top navigation header. |

---

### 3. Background Web Workers (`src/workers/`)

| File Path | Role & What It Does | Why It Exists |
| :--- | :--- | :--- |
| [`embedding.worker.ts`](file:///c:/Nandha/RND/Self/Document_Assistant/src/workers/embedding.worker.ts) | Runs `bge-small-en-v1.5` in a background OS thread. | Offloads heavy embedding math so the 60fps UI never lags. |
| [`llm.worker.ts`](file:///c:/Nandha/RND/Self/Document_Assistant/src/workers/llm.worker.ts) | Runs `Qwen2.5-0.5B-Instruct` on WebGPU with shader warmup. | Generates streaming tokens on the GPU with WASM fallback. |

---

### 4. Storage & Persistence Layer (`src/storage/`)

| File Path | Role & What It Does | Why It Exists |
| :--- | :--- | :--- |
| [`db.ts`](file:///c:/Nandha/RND/Self/Document_Assistant/src/storage/db.ts) | Dexie.js IndexedDB schema definition. | Sets up local relational tables (`sessions`, `documents`, `chunks`, `messages`). |
| [`types.ts`](file:///c:/Nandha/RND/Self/Document_Assistant/src/storage/types.ts) | Interfaces for storage quotas and JSON backups. | Defines data migration and quota reporting formats. |
| [`repositories/sessionRepository.ts`](file:///c:/Nandha/RND/Self/Document_Assistant/src/storage/repositories/sessionRepository.ts) | Session CRUD and cascading deletion. | Deleting a workspace purges all documents, chunks, and chats. |
| [`repositories/documentRepository.ts`](file:///c:/Nandha/RND/Self/Document_Assistant/src/storage/repositories/documentRepository.ts) | Document metadata attachment. | Links uploaded file records to specific workspaces. |
| [`repositories/chunkRepository.ts`](file:///c:/Nandha/RND/Self/Document_Assistant/src/storage/repositories/chunkRepository.ts) | Stores and queries chunks and 384-dim vectors. | Provides fast indexed retrieval of vector coordinates. |
| [`repositories/messageRepository.ts`](file:///c:/Nandha/RND/Self/Document_Assistant/src/storage/repositories/messageRepository.ts) | Chat history persistence. | Preserves chat turns, source citations, and WebGPU telemetry. |
| [`quotaService.ts`](file:///c:/Nandha/RND/Self/Document_Assistant/src/storage/quotaService.ts) | Queries `navigator.storage.estimate()`. | Monitors disk usage and requests persistent storage permission. |
| [`backupService.ts`](file:///c:/Nandha/RND/Self/Document_Assistant/src/storage/backupService.ts) | Complete JSON workspace export/import. | Enables one-click data migration and offline backup. |

---

### 5. UI Features & Components (`src/features/` & `src/components/`)

| File Path | Role & What It Does | Why It Exists |
| :--- | :--- | :--- |
| [`features/sessions/types.ts`](file:///c:/Nandha/RND/Self/Document_Assistant/src/features/sessions/types.ts) | Core domain types (`Session`, `ChatMessage`, `SourceReference`). | Shared type system across all feature components. |
| [`features/sessions/useSessions.ts`](file:///c:/Nandha/RND/Self/Document_Assistant/src/features/sessions/useSessions.ts) | Primary React hook managing sessions and chat state. | Glues IndexedDB, RAG execution, and chat UI together. |
| [`features/sessions/SessionWorkspace.tsx`](file:///c:/Nandha/RND/Self/Document_Assistant/src/features/sessions/SessionWorkspace.tsx) | Workspace view container. | Switches between Empty Dropzone and Active Chat view. |
| [`features/documents/DocumentDropzone.tsx`](file:///c:/Nandha/RND/Self/Document_Assistant/src/features/documents/DocumentDropzone.tsx) | Drag-and-drop file ingestion area. | Provides progress bars (Parsing $\rightarrow$ Chunking $\rightarrow$ Embedding). |
| [`features/documents/DocumentCard.tsx`](file:///c:/Nandha/RND/Self/Document_Assistant/src/features/documents/DocumentCard.tsx) | Document header card in active chat. | Triggers Page Inspector, Chunk Inspector, and Search Lab. |
| [`features/documents/ChunkInspectorModal.tsx`](file:///c:/Nandha/RND/Self/Document_Assistant/src/features/documents/ChunkInspectorModal.tsx) | Chunk search and 384-dim vector coordinate viewer. | Allows visual inspection of chunks, tokens, and vector floats. |
| [`features/documents/useDocumentUpload.ts`](file:///c:/Nandha/RND/Self/Document_Assistant/src/features/documents/useDocumentUpload.ts) | Ingestion pipeline hook. | Executes Parse $\rightarrow$ Chunk $\rightarrow$ Embed $\rightarrow$ Store in one call. |
| [`features/chat/ChatContainer.tsx`](file:///c:/Nandha/RND/Self/Document_Assistant/src/features/chat/ChatContainer.tsx) | Chat message feed with auto-scroll. | Displays conversational turns with smooth scrolling. |
| [`features/chat/ChatMessageItem.tsx`](file:///c:/Nandha/RND/Self/Document_Assistant/src/features/chat/ChatMessageItem.tsx) | Chat message bubble. | Renders markdown, citations, confidence meters, and speed metrics. |
| [`features/chat/GroundedTextRenderer.tsx`](file:///c:/Nandha/RND/Self/Document_Assistant/src/features/chat/GroundedTextRenderer.tsx) | Inline citation regex parser. | Converts `[1]` in text into clickable interactive `[1: p.1]` buttons. |
| [`features/chat/ChatInput.tsx`](file:///c:/Nandha/RND/Self/Document_Assistant/src/features/chat/ChatInput.tsx) | Auto-growing textarea composer. | Supports Enter/Shift+Enter shortcuts and Stop Generation button. |
| [`features/sources/SourcePreviewModal.tsx`](file:///c:/Nandha/RND/Self/Document_Assistant/src/features/sources/SourcePreviewModal.tsx) | Citation preview modal. | Shows verified page number, section title, and copy excerpt. |
| [`features/sources/SemanticSearchModal.tsx`](file:///c:/Nandha/RND/Self/Document_Assistant/src/features/sources/SemanticSearchModal.tsx) | Interactive vector retrieval test lab. | Lets you test semantic queries with real-time match meters. |
| [`components/Header.tsx`](file:///c:/Nandha/RND/Self/Document_Assistant/src/components/Header.tsx) | Navigation header. | Session rename, Privacy badge, Qwen status, WebGPU badge. |
| [`components/Sidebar.tsx`](file:///c:/Nandha/RND/Self/Document_Assistant/src/components/Sidebar.tsx) | Collapsible sidebar. | Workspace creation, selection, rename, delete, storage manager. |
| [`components/HardwareModal.tsx`](file:///c:/Nandha/RND/Self/Document_Assistant/src/components/HardwareModal.tsx) | Hardware specs & GPU benchmark tool. | Runs 64-token speed test to benchmark local graphics hardware. |
| [`components/ModelManagerModal.tsx`](file:///c:/Nandha/RND/Self/Document_Assistant/src/components/ModelManagerModal.tsx) | Qwen model manager. | Manages model downloads (~350MB) and switches between 0.5B/1.5B. |
| [`components/StorageModal.tsx`](file:///c:/Nandha/RND/Self/Document_Assistant/src/components/StorageModal.tsx) | Storage quota manager. | Shows disk usage, persistent storage status, JSON backup/restore. |
| [`components/SecurityModal.tsx`](file:///c:/Nandha/RND/Self/Document_Assistant/src/components/SecurityModal.tsx) | Security & Zero-Egress audit modal. | Live verification checklist of air-gapped isolation and filters. |
| [`components/Layout.tsx`](file:///c:/Nandha/RND/Self/Document_Assistant/src/components/Layout.tsx) | Master layout container. | Houses Sidebar, Header, Modals, and main viewport. |
| [`app/App.tsx`](file:///c:/Nandha/RND/Self/Document_Assistant/src/app/App.tsx) | Root application coordinator. | Bootstraps hooks and routes state to UI components. |

---

### 6. Security & Utilities (`src/utils/`)

| File Path | Role & What It Does | Why It Exists |
| :--- | :--- | :--- |
| [`utils/security.ts`](file:///c:/Nandha/RND/Self/Document_Assistant/src/utils/security.ts) | Strips ChatML delimiter control tokens (`<\|im_start\|>`). | Defends against **Indirect Prompt Injection** from untrusted files. |
| [`utils/privacyAudit.ts`](file:///c:/Nandha/RND/Self/Document_Assistant/src/utils/privacyAudit.ts) | Inspects origin isolation and storage boundaries. | Provides programmatic proof of zero data egress. |

---

## 5. Key Talking Points for Your Presentation

When explaining this project to your senior or team, emphasize these 5 core engineering achievements:

1. **Air-Gapped Privacy Guarantee**:
   * *"Most RAG applications send confidential PDFs to OpenAI or third-party vector databases. Our architecture runs 100% inside the user's browser tab using WebGPU and IndexedDB. Zero bytes of document data ever leave the machine."*
2. **Dedicated Background Web Workers for Zero-Jank UI**:
   * *"Heavy neural network computations (embeddings and LLM autoregression) run in separate OS threads via Web Workers. This ensures the React UI maintains 60fps animations with zero stutter."*
3. **WebGPU Hardware Acceleration & Shader Pre-Warming**:
   * *"We achieve 25–45 tokens/second using 4-bit quantized Qwen models on consumer GPUs. An automatic 1-token warmup pass compiles WGSL shaders in the background, eliminating first-token latency."*
4. **Anti-Hallucination Guardrails with Early Short-Circuiting**:
   * *"If a user asks a question not present in the document, our retriever short-circuits on low similarity (< 0.28) and politely declines without wasting GPU cycles on an ungrounded LLM hallucination."*
5. **Fine-Grained Sentence Citations**:
   * *"The AI attributes every claim with inline bracket markers (`[1: p.1]`). Clicking a marker opens an interactive inspector showing the verified source page, section heading, and exact document excerpt."*

---

## 6. Common Senior Questions & Cheat-Sheet Answers

* **Q: How does the browser run a 350MB model without crashing?**  
  * **A**: We use **4-bit integer quantization (`q4`)** via ONNX Runtime Web. Quantization reduces model weights by ~75% with negligible loss in reasoning, allowing the model to fit easily within standard browser VRAM allocations.

* **Q: What happens if a user's computer doesn't have a WebGPU-compatible GPU?**  
  * **A**: The system features **automatic graceful fallback** to multithreaded **WebAssembly SIMD (128-bit vectorized CPU math)**, ensuring the application remains functional across all modern devices.

* **Q: How do you prevent users' documents from mixing between sessions?**  
  * **A**: All database operations in IndexedDB are partitioned strictly by `sessionId`. The vector retriever filters chunks by `sessionId` before computing similarity, making cross-session data leakage impossible.
