# Model Strategy & Selection

This document outlines the model family selection, quantization tiers, and execution backends for in-browser inference.

---

## 1. Small Language Models (SLMs): Qwen 2.5 Family (Implemented: Phase 8)

We use Alibaba's **Qwen 2.5** family running directly inside the browser via WebGPU / ONNX Runtime:

| Model Candidate | Parameters | Quantization | Size on Disk | Target Hardware | Execution Engine |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Qwen 2.5 0.5B Instruct** (Default) | 0.5 Billion | `q4` (4-bit) | ~350 MB | Low-end laptops, mobile browsers, integrated GPUs | WebGPU (WASM fallback) |
| **Qwen 2.5 1.5B Instruct** | 1.5 Billion | `q4` (4-bit) | ~950 MB | Standard laptops, Apple Silicon M1+, discrete GPUs | WebGPU |

### Prompt Structure (ChatML Template):
```
<|im_start|>system
You are a helpful and factual document assistant. Answer the user's question accurately using ONLY the information provided in the document context below.
If the answer cannot be found in the document context, respond with: "The document does not contain information to answer this question."
Do not invent or extrapolate facts. Be concise and direct.

--- DOCUMENT CONTEXT ---
[Page 1 - Executive Summary]
Acme Corporation achieved record gross revenue of $142.5 million...
------------------------<|im_end|>
<|im_start|>user
What was the revenue in 2025?<|im_end|>
<|im_start|>assistant
```

---

## 2. Embedding Model (Implemented: Phase 6)

| Model | Dimensions | Size (ONNX Quantized) | Use Case |
| :--- | :--- | :--- | :--- |
| **Xenova/bge-small-en-v1.5** | 384 | ~45 MB | High-accuracy semantic embedding for English RAG |

---

## 3. Caching & Zero-Cloud Latency
* Both the embedding model (`~45MB`) and Qwen SLM (`~350MB`) are downloaded directly into the browser's **Cache API** (`CacheStorage`).
* After the initial download, both models load **instantly from disk** with zero network transfer.
