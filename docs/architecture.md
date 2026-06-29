# Architecture

Compliance Copilot is a monorepo with three packages:

```
compliance-copilot/
├── frontend/          # Next.js web app (port 3000)
├── backend/           # NestJS API (port 4000)
├── packages/shared/   # Shared DTOs and constants
└── supabase/          # SQL migrations (Postgres + pgvector + Storage)
```

The frontend handles authentication via Supabase Auth and calls the NestJS API with a Bearer token. The backend owns all AI and data operations using the Supabase **service role** key.

## High-level diagram

```mermaid
flowchart TB
  subgraph Client
    UI[Next.js Frontend]
    Auth[Supabase Auth]
  end

  subgraph Vercel
    API[NestJS Backend]
  end

  subgraph Supabase
    PG[(Postgres + pgvector)]
    Storage[(Storage: documents bucket)]
    AuthSvc[Auth / JWT]
  end

  subgraph Google
    Embed[gemini-embedding-001]
    Gen[gemini-2.5-flash-lite]
  end

  UI -->|Bearer JWT| API
  UI -->|sign in / session| Auth
  Auth --> AuthSvc
  API -->|service role| PG
  API -->|upload / download PDFs| Storage
  API --> Embed
  API --> Gen
```

## User flow

```mermaid
sequenceDiagram
  actor User
  participant UI as Frontend
  participant Auth as Supabase Auth
  participant API as NestJS API
  participant DB as Postgres
  participant AI as Gemini

  User->>UI: Sign in
  UI->>Auth: Email / password
  Auth-->>UI: Access token

  User->>UI: Upload PDF
  UI->>API: POST /documents (multipart)
  API->>DB: Insert document (pending)
  API->>Storage: Store PDF
  API-->>UI: { id, status: pending }
  API->>API: Background ingestion

  loop Poll every 3s
    UI->>API: GET /documents/:id
    API-->>UI: status: processing → ready
  end

  User->>UI: Ask question
  UI->>API: POST /documents/:id/chat (SSE)
  API->>AI: Embed query
  API->>DB: match_chunks (cosine similarity)
  API->>AI: Stream grounded answer
  API-->>UI: tokens + citations
  API->>DB: Persist messages

  User->>UI: Generate summary
  UI->>API: POST /documents/:id/summary
  API->>DB: Load all chunks
  API->>AI: Map-reduce structured JSON
  API->>DB: Upsert summary
  API-->>UI: ComplianceSummaryDto
```

## Backend modules

| Module             | Responsibility                                                |
| ------------------ | ------------------------------------------------------------- |
| `DocumentsModule`  | PDF upload, listing, ownership checks, ingestion trigger      |
| `IngestionService` | Extract text → chunk → embed → store (async, fire-and-forget) |
| `RetrievalService` | Vector search via `match_chunks` RPC                          |
| `ChatModule`       | RAG Q&A with SSE streaming and citation building              |
| `SummaryModule`    | Map-reduce compliance summary with structured JSON output     |
| `GeminiModule`     | Embeddings, streaming generation, schema-constrained JSON     |
| `SupabaseModule`   | DB client, storage upload/download                            |
| `AuthGuard`        | Validates Supabase JWT on every protected route               |

## RAG pipeline

```mermaid
flowchart LR
  subgraph Ingestion
    PDF[PDF upload] --> Extract[unpdf per-page extract]
    Extract --> Chunk[Page-aware chunker]
    Chunk --> Embed[Batch embed documents]
    Embed --> Store[(chunks table)]
  end

  subgraph Query
    Q[User question] --> QEmbed[Embed query]
    QEmbed --> Search[match_chunks top-k]
    Search --> Gate{score ≥ 0.45?}
    Gate -->|no| NotFound[Deterministic not-found]
    Gate -->|yes| Prompt[Build context prompt]
    Prompt --> Stream[Stream answer]
    Stream --> Cite[Build citations]
  end

  Store --> Search
```

## Data model

```mermaid
erDiagram
  auth_users ||--o{ documents : owns
  documents ||--o{ chunks : contains
  documents ||--o{ messages : has
  documents ||--o| summaries : has

  documents {
    uuid id PK
    uuid user_id FK
    text filename
    text storage_path
    text status
    int page_count
    text error
  }

  chunks {
    uuid id PK
    uuid document_id FK
    text content
    int page_number
    int chunk_index
    vector embedding
  }

  messages {
    uuid id PK
    uuid document_id FK
    uuid user_id FK
    text role
    text content
    jsonb citations
  }

  summaries {
    uuid id PK
    uuid document_id FK
    jsonb obligations
    jsonb risks
    jsonb gaps
    jsonb recommended_actions
  }
```

### Document lifecycle

| Status       | Meaning                                               |
| ------------ | ----------------------------------------------------- |
| `pending`    | Row created; ingestion not yet started                |
| `processing` | PDF downloaded, text extracted, chunks being embedded |
| `ready`      | All chunks stored; chat and summary unlocked          |
| `failed`     | Ingestion error persisted in `documents.error`        |

## Data storage

| Store                                 | Contents                                                |
| ------------------------------------- | ------------------------------------------------------- |
| Supabase Storage (`documents` bucket) | Raw PDFs at `{userId}/{documentId}.pdf`                 |
| `documents` table                     | Metadata and processing status                          |
| `chunks` table                        | Chunk text, page number, 768-dim embedding (HNSW index) |
| `messages` table                      | Chat history with citation JSON                         |
| `summaries` table                     | One cached structured summary per document              |

Row Level Security (RLS) is enabled on all tables. The API uses the service role and enforces ownership in application code (`getOwnedRow`, `AuthGuard`).

## AI services

| Operation          | Model                   | Notes                                                    |
| ------------------ | ----------------------- | -------------------------------------------------------- |
| Document embedding | `gemini-embedding-001`  | `RETRIEVAL_DOCUMENT` task, 768 dims, L2-normalized       |
| Query embedding    | `gemini-embedding-001`  | `RETRIEVAL_QUERY` task                                   |
| Chat generation    | `gemini-2.5-flash-lite` | Temperature 0.2, streamed via SSE                        |
| Summary generation | `gemini-2.5-flash-lite` | JSON schema constrained output, map-reduce for long docs |

## Deployment topology

Production uses **Vercel Services** (see root `vercel.json`):

- `frontend` → `/` (Next.js)
- `backend` → `/api` (NestJS)

Vercel injects `NEXT_PUBLIC_BACKEND_URL=/api` so the frontend and API share one origin (no CORS configuration needed in production). Supabase (database, auth, storage) runs as a managed external service.

Local development runs both apps in parallel (`pnpm dev`): frontend on `:3000`, backend on `:4000`.

## Cross-cutting concerns

- **Logging:** `nestjs-pino` with authorization header redaction
- **Validation:** `class-validator` DTOs + global `ValidationPipe`
- **Errors:** `AllExceptionsFilter` returns consistent JSON error bodies
- **Shared contracts:** `@ccp/shared` package prevents frontend/backend type drift
- **CI:** GitHub Actions — lint, typecheck, format check, build on `main`
