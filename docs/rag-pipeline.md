# Retrieval-Augmented Generation (RAG) Architecture

A reference guide on how the client-side RAG pipeline operates from document parsing to source attribution.

---

## The 5 Stages of Client-Side RAG

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ 1. Ingestion    │ ──► │ 2. Chunking      │ ──► │ 3. Embedding     │
│ PDF / Text / MD │     │ Recursive Split  │     │ 384-dim Vectors  │
│ (pdfjs-dist)    │     │ 500c / 80o       │     │ (Transformers.js)│
└─────────────────┘     └────────┬─────────┘     └────────┬─────────┘
                                 │                        │
                                 ▼                        ▼
                        ┌──────────────────┐     ┌──────────────────┐
                        │ IndexedDB Chunks │     │ IndexedDB Store  │
                        │ + Page Metadata  │     │ + Vector Index   │
                        └──────────────────┘     └────────┬─────────┘
                                                          │
                                                          ▼
┌─────────────────┐                              ┌──────────────────┐
│ 5. Generation   │ ◄─────────────────────────── │ 4. Retrieval     │
│ Qwen WebGPU SLM │    ChatML Context Prompt     │ In-Browser       │
│ + Citations [1] │    + Negative Constraints    │ Cosine Top-K     │
└────────┬────────┘                              └──────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│ 6. Source Attribution (Phase 10)       │
│ • Inline Citation Badges: [1: p.1]     │
│ • Grounding Confidence Metric: 92%     │
│ • Interactive Source Inspection Modal  │
└────────────────────────────────────────┘
```

---

## 1. Document Parsing & Text Extraction (Phase 3)
* Uses `pdfjs-dist` to extract structured `{ pageNumber, text }` tuples in client RAM.

---

## 2. Recursive Character Text Chunking (Phase 5)
* 500-character target chunks with 80-character sliding overlap preserving paragraphs, sentences, exact page numbers, and section titles.

---

## 3. In-Browser Dense Vector Embeddings (Phase 6)
* Model: `Xenova/bge-small-en-v1.5` running in a dedicated Web Worker.
* Outputs 384-dimensional L2-normalized float vectors stored in IndexedDB.

---

## 4. Vector Semantic Retrieval (Phase 7)
* Scoped IndexedDB cosine similarity dot product with minimum threshold filtering ($\ge 0.28$) and top-$K$ ranking.

---

## 5. RAG Orchestration & Prompt Guardrails (Phase 9)
* Master pipeline (`ragCoordinator.ts`) with early short-circuiting on low similarity and strict negative constraints.

---

## 6. Source Attribution & Grounded Responses (Implemented: Phase 10)

### Fine-Grained Attribution:
* **Prompt Instructions**: Instructs the model to append `[1]`, `[2]` after each factual claim.
* **`GroundedTextRenderer.tsx`**: Dynamic regex parser detecting bracketed numbers and rendering them as interactive buttons (`[1: p.2]`).
* **Source Inspection**: Clicking an inline pill opens `SourcePreviewModal.tsx` displaying the exact page number, section title, similarity confidence gauge, and original document excerpt.
