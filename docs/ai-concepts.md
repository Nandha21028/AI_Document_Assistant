# AI & Machine Learning Concepts Guide

An educational reference for client-side AI, dense embeddings, vector retrieval, WebGPU inference, and RAG.

---

## 1. Dense Vector Embeddings

* **What is an Embedding?**:
  * A mathematical function that converts text into coordinates in continuous vector space $\mathbb{R}^{384}$.
  * Sentences sharing semantic meaning map to nearby vectors regardless of whether they share exact vocabulary.
* **Mean Pooling**:
  * Transformer encoders produce a vector for each token. Mean pooling calculates the average vector across all tokens in the sequence to represent the entire passage.
* **L2 Normalization**:
  * Divides the vector by its Euclidean magnitude ($\|\mathbf{v}\|_2 = \sqrt{\sum v_i^2}$) so its length equals $1.0$.
  * Normalization simplifies Cosine Similarity into a single, high-performance dot product:
    $$\text{Similarity}(\mathbf{u}, \mathbf{v}) = \sum_{i=1}^{384} u_i \cdot v_i$$

---

## 2. In-Browser Small Language Models (SLMs)

* **Autoregressive Generation**:
  * Predicts text token-by-token using preceding context: $P(w_t \mid w_{<t})$.
* **4-bit Weight Quantization (`q4`)**:
  * Quantizes floating-point neural weights into 4-bit integers.
  * Shrinks `Qwen2.5-0.5B-Instruct` from ~1.5GB to **~350MB**, allowing it to fit into standard browser RAM/VRAM.
* **WebGPU Direct Compute Shaders**:
  * Executes matrix multiplication and attention calculations directly on the client's GPU via WGSL compute shaders, achieving 20–45+ tokens/second.
* **WebAssembly SIMD (Single Instruction Multiple Data)**:
  * 128-bit vectorized CPU execution used as an automatic fallback when WebGPU hardware is unavailable.

---

## 3. Retrieval-Augmented Generation (RAG)

* **Why RAG is Necessary**:
  * LLMs have a fixed knowledge cutoff and are prone to hallucinations.
  * RAG retrieves relevant factual excerpts from a user's verified document and injects them into the prompt before generating an answer.
* **Negative Constraints & Anti-Hallucination**:
  * System prompt rules commanding the LLM: *"If the document context does not contain sufficient facts, respond with: 'The uploaded document does not contain information to answer this question.'"*
* **Fine-Grained Claim Attribution**:
  * Inserting inline bracket citations `[1: p.1]` after each statement allows users to immediately verify facts against the original source text.
