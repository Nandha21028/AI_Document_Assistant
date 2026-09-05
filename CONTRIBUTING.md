# Contributing to AI Document Assistant

Thank you for your interest in contributing to **AI Document Assistant**! We are committed to building a privacy-first, on-device AI document intelligence platform accessible to everyone.

## Getting Started

1. **Fork the repository** on GitHub.
2. **Clone your fork**:
   ```bash
   git clone https://github.com/<your-username>/AI_Document_Assistant.git
   cd AI_Document_Assistant
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Start the local dev server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in a WebGPU-supported browser (Chrome 113+, Edge 113+).

## Development Guidelines

- **Code Style**: TypeScript strict mode is enabled. Ensure code compiles without errors (`npm run build`).
- **Air-Gapped Invariance**: Any new parser, tokenizer, or feature **must not make outbound network requests**. All processing must execute strictly in-memory or in isolated Web Workers.
- **Worker Offloading**: CPU/GPU-intensive tasks (embeddings, token streaming, heavy parsing) must run in Web Workers to keep the UI smooth at 60 FPS.

## Pull Request Process

1. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Commit your changes with clear, descriptive commit messages:
   ```bash
   git commit -m "feat(parser): add support for docx files"
   ```
3. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
4. Open a **Pull Request** against `main` on GitHub with a summary of changes and testing steps.

---

Thank you for helping us make on-device, private AI available to everyone!
