# Storage & IndexedDB Architecture

A specification of the client-side persistent storage architecture, repository pattern, schema design, and backup systems.

---

## 1. IndexedDB Schema Design (Dexie.js)

Database Name: `DocAssistantDB` (Version 1)

```
┌────────────────────────────────────────────────────────────────────────┐
│                              DocAssistantDB                            │
├────────────────────────────────────────────────────────────────────────┤
│ • sessions:  id (PK), createdAt, updatedAt                             │
│ • documents: id (PK), sessionId (Index), status, uploadedAt            │
│ • chunks:    id (PK), sessionId (Index), documentId (Index),           │
│              pageNumber, chunkIndex                                    │
│ • messages:  id (PK), sessionId (Index), timestamp, role               │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. The Repository Pattern

All data access is mediated through isolated repository modules in `src/storage/repositories/`:

1. **`sessionRepository.ts`**:
   - `create(title)`: Initializes a new workspace.
   - `deleteWithCascade(id)`: Runs an atomic transaction clearing session, documents, chunks, and messages.
   - `updateTitle(id, title)`: Renames session.
2. **`documentRepository.ts`**:
   - `attachToSession(sessionId, doc)`: Links parsed metadata to a workspace.
   - `getBySessionId(sessionId)`: Fetches active document.
3. **`chunkRepository.ts`**:
   - `saveChunks(chunks)`: Bulk stores chunks with 384-dimensional float vector embeddings.
   - `getBySessionId(sessionId)`: Queries session chunks for vector retrieval.
4. **`messageRepository.ts`**:
   - `add(message)`: Persists user/assistant chat turns with source citations and WebGPU performance metrics.

---

## 3. Storage Quota & Eviction Protection

* **`quotaService.ts`**: Queries `navigator.storage.estimate()` to inspect available disk bytes and usage percentages.
* **`persist()` API**: Requests persistent storage permission (`navigator.storage.persist()`) to prevent the browser from automatically evicting IndexedDB under disk pressure.

---

## 4. One-Click Backup & Data Portability

* **`backupService.ts`**:
  - `exportCompleteBackup()`: Serializes all sessions, documents, chunks, vectors, and message histories into a single timestamped JSON file.
  - `importBackup(jsonString)`: Restores complete workspace state from JSON with zero data corruption.
