# Performance & WebGPU Optimization Guide

A reference guide on hardware acceleration, shader compilation, latency optimization, and memory budgeting.

---

## 1. WebGPU Compute Shaders vs. WASM SIMD

| Pipeline Phase | Primary Execution Engine | Fallback Engine | Typical Latency / Throughput |
| :--- | :--- | :--- | :--- |
| **Vector Embeddings** (`bge-small-en-v1.5`) | WebGPU Compute / ONNX | WASM Multithreading (SIMD) | 10–30ms per chunk |
| **Vector Dot Product Retrieval** | Typed Array JS Loop | Native WASM | < 2ms across 500 chunks |
| **Qwen 2.5 0.5B Instruct (`q4`)** | WebGPU Direct3D 12 / Metal | WASM SIMD Multithreaded | **18–45+ tokens/sec** (WebGPU) vs. 4–8 tok/s (WASM) |

---

## 2. Optimizations Implemented (Phase 11)

### 1. 1-Token Shader Warmup Pass
* **Problem**: First-time WGSL compute shader compilation causes 2–4 seconds of initial stutter.
* **Solution**: Automatically dispatches a 1-token dummy generation (`"hi"`) during model loading to pre-compile all attention, layer-norm, and matrix multiplication kernels.

### 2. Live Performance Telemetry
* **Time-to-First-Token (TTFT)**: Measured using `performance.now()` from query dispatch to first emitted token.
* **Generation Throughput (Tokens/Second)**: Calculated dynamically:
  $$\text{TPS} = \frac{\text{Generated Tokens}}{\Delta t_{\text{generation}}}$$

### 3. Graceful Device Loss Recovery
* If the WebGPU device resets or encounters driver preemption, the worker catches `device.lost` and immediately re-initializes inference on **WASM SIMD** without crashing the user session or losing chat history.

### 4. Interactive GPU Benchmark Tool
* Runs a standardized 64-token generation pass in `HardwareModal.tsx` to benchmark local graphics hardware in real time.
