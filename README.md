<div align="center">

# 🧠 AI Document Assistant

### **100% Client-Side • Zero-Server • Air-Gapped In-Browser RAG & Document Intelligence**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb?logo=react&logoColor=black)](https://reactjs.org/)
[![WebGPU](https://img.shields.io/badge/Hardware-WebGPU%20Accelerated-green?logo=webgpu&logoColor=white)](https://www.w3.org/TR/webgpu/)
[![Vite](https://img.shields.io/badge/Vite-6.1-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/Nandha21028/AI_Document_Assistant/pulls)

<p align="center">
  <b>Chat with your PDFs, Excel sheets, CSVs, and Markdown files completely offline.</b><br>
  No API keys, no monthly subscriptions, and no data leaving your machine — ever.
</p>

---

</div>

## 🌟 Overview

**AI Document Assistant** is a production-grade, privacy-first Retrieval-Augmented Generation (RAG) application running **entirely in your browser**. Powered by **WebGPU compute shaders**, **Transformers.js**, and on-device **Small Language Models (SLMs)**, it turns your browser into an autonomous, air-gapped document intelligence platform.

Your files and questions **never touch a cloud server**. Everything — from text parsing and recursive chunking to 384-dimensional vector embeddings and token generation — executes locally in browser memory and isolated Web Workers.

---

## ✨ Key Features

- 🔒 **100% Private & Air-Gapped**
  - Zero telemetry, zero external API calls. Disconnect your Wi-Fi after initial model caching and it continues running completely offline.
- ⚡ **WebGPU Hardware Accelerated**
  - Uses native GPU compute shaders for low-latency token generation with automatic shader pre-warming and graceful WebAssembly (WASM SIMD) fallback.
- 🧠 **On-Device SLMs (Qwen 2.5 Family)**
  - Runs Alibaba's **Qwen 2.5 (0.5B & 1.5B Instruct)** 4-bit quantized (`q4`) models directly inside the browser using ONNX Runtime Web.
- 📐 **In-Browser Dense Vector Embeddings**
  - Computes 384-dimensional dense semantic vectors using `Xenova/bge-small-en-v1.5` in a background Web Worker without freezing the UI.
- 📑 **Universal Multi-Format Ingestion**
  - Natively parses **PDFs** (`pdfjs-dist`), **Excel** spreadsheets (`xlsx`), **CSVs**, and **Markdown/Text** files directly in client memory.
- 🎯 **Source Grounding & Interactive Citations**
  - Dynamic inline citation badges (e.g., `[1: p.2]`). Click any citation to inspect the exact source text, page number, and similarity score.
- 💾 **Persistent IndexedDB Vector Storage**
  - Powered by Dexie.js. Your documents, extracted chunks, and vector embeddings remain securely cached on your machine across reloads.
- 📊 **Real-Time Performance Telemetry**
  - Live tracking of **Tokens Per Second (tok/s)**, **Time to First Token (TTFT)**, model memory footprints, and built-in GPU speed benchmarking.

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 BROWSER APPLICATION                                    │
│                                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │                            REACT 18 UI LAYER (Main Thread)                       │  │
│  │                                                                                  │  │
│  │  • Session Workspace & File Dropzone                                             │  │
│  │  • Document & Chunk Inspector (Search Lab & Vector Visualizer)                   │  │
│  │  • Chat Feeds with Interactive Inline Citations [1: p.2]                         │  │
│  │  • Hardware Benchmark Runner & Model Manager Modal                               │  │
│  └─────────────────────────────────────────┬────────────────────────────────────────┘  │
│                                            │ Query & Ingestion Dispatch                │
│                                            ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │                            ai/rag/ragCoordinator.ts                              │  │
│  │                                                                                  │  │
│  │  • Cosine Similarity Retrieval -> ChatML Assembly -> WebGPU Generation Stream    │  │
│  └─────────────────────────────────────────┬────────────────────────────────────────┘  │
│                                            │                                           │
│                     ┌──────────────────────┴──────────────────────┐                    │
│                     ▼                                             ▼                    │
│  ┌──────────────────────────────────────┐   ┌──────────────────────────────────────┐  │
│  │       EMBEDDING WEB WORKER           │   │         LLM INFERENCE WORKER         │  │
│  │ ──────────────────────────────────── │   │ ──────────────────────────────────── │  │
│  │ • Xenova/bge-small-en-v1.5           │   │ • Qwen 2.5 (0.5B / 1.5B 4-bit q4)    │  │
│  │ • 384-dim Vector Generation          │   │ • WebGPU Shader Compute Engine       │  │
│  │ • Mean Pooling + L2 Normalization    │   │ • 1-Token WGSL Shader Warmup Pass    │  │
│  │ • IndexedDB Vector Store via Dexie   │   │ • Live Telemetry (TTFT & tok/s)      │  │
│  └──────────────────────────────────────┘   └──────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **Modern Browser**: Chrome 113+, Microsoft Edge, Brave, or any browser with **WebGPU** support enabled.

### 1. Clone the Repository
```bash
git clone https://github.com/Nandha21028/AI_Document_Assistant.git
cd AI_Document_Assistant
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser to launch the assistant!

### 4. Build for Production
```bash
npm run build
npm run preview
```

---

## 🤖 Models & Resource Footprint

Both models are downloaded **once** from Hugging Face Hub and cached permanently in your browser's native `CacheStorage`. Subsequent visits load instantly from local storage with **zero network requests**.

| Model | Parameters | Quantization | Cache Size | Purpose | Default Engine |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Qwen 2.5 0.5B Instruct** | 0.5 Billion | `q4` (4-bit) | ~350 MB | Default fast reasoning & answers | WebGPU / WASM |
| **Qwen 2.5 1.5B Instruct** | 1.5 Billion | `q4` (4-bit) | ~950 MB | Enhanced reasoning & depth | WebGPU |
| **BGE Small EN v1.5** | 33 Million | ONNX INT8 | ~45 MB | Semantic document embeddings (384-d) | Transformers.js |

---

## 📂 Project Structure

```
AI_Document_Assistant/
├── docs/                    # Deep-dive architecture, RAG pipeline, and security documentation
├── src/
│   ├── ai/                  # AI engine internals
│   │   ├── embeddings/      # Vector embedding generator & similarity matching
│   │   ├── inference/       # WebGPU pipeline & model runners
│   │   ├── models/          # Model registry & memory manager
│   │   ├── prompts/         # ChatML prompt templates & strict negative guardrails
│   │   ├── rag/             # Master RAG pipeline coordinator
│   │   └── retrieval/       # Scoped vector search & cosine top-k algorithms
│   ├── components/          # Reusable UI components & modals (Hardware, Models, Storage)
│   ├── db/                  # Dexie.js IndexedDB schema and stores
│   ├── documents/           # Document parsing, recursive chunking & token estimation
│   │   ├── chunking/        # Recursive 500-char sliding chunker with overlap
│   │   └── parsers/         # PDF, Excel, CSV, and text extractors
│   ├── features/            # Feature-centric modules (Sessions, Documents, Chat, Sources)
│   └── workers/             # Dedicated Web Workers for LLM & Embedding offloading
├── index.html               # Entry HTML shell
├── package.json             # Scripts & dependencies
├── tailwind.config.js       # Modern Tailwind styling setup
└── vite.config.ts           # High-performance Vite build config
```

---

## 🛡️ Privacy & Security Guarantee

- **Zero Data Ingress/Egress**: Documents are processed strictly within JavaScript memory and stored in your browser's sandboxed IndexedDB database.
- **Air-Gapped Capable**: Disconnect your internet connection after loading the models — the application remains 100% operational.
- **No Third-Party Analytics**: No tracking cookies, no Google Analytics, no third-party telemetry.

---

## 🤝 Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**!

1. **Fork** the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a **Pull Request**

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

<div align="center">

Made with ❤️ for private, accessible AI by [Nandha21028](https://github.com/Nandha21028)

*If this project helped you or you find client-side AI exciting, please consider giving it a ⭐ star!*

</div>
