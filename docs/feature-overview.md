# Feature Overview

This document describes Compliance Copilot's product capabilities and how they are implemented in the codebase.

## Core capabilities

### 1. Document Upload & Processing

| Capability               | Implementation                                                       |
| ------------------------ | -------------------------------------------------------------------- |
| Upload a PDF             | `POST /documents` with `multipart/form-data` (`DocumentsController`) |
| Extract and process text | `unpdf` per-page extraction (`pdf-extractor.ts`)                     |
| Store processed content  | Chunks + embeddings in `chunks` table; raw PDF in Supabase Storage   |

**Details:**

- Max upload size: 20 MB (`DEFAULT_MAX_UPLOAD_BYTES`)
- MIME validation: `application/pdf` only
- Processing is **asynchronous** — upload returns immediately with `pending` status; client polls `GET /documents/:id`
- Scanned/image-only PDFs fail gracefully with a clear error message

### 2. AI-Powered Question Answering (RAG)

| Capability                    | Implementation                                                                |
| ----------------------------- | ----------------------------------------------------------------------------- |
| Answers from document only    | System prompt restricts to provided context; low-similarity gate              |
| Retrieves relevant chunks     | pgvector cosine search via `match_chunks` RPC (top-5)                         |
| Source references / citations | Inline page citations in answer + structured `Citation[]` with snippets       |
| Handles missing information   | Similarity threshold (0.45) short-circuits to deterministic not-found message |

See [RAG Implementation](./rag-implementation.md) for full detail.

### 3. Compliance Risk Summary

| Capability                 | Implementation                            |
| -------------------------- | ----------------------------------------- |
| Key compliance obligations | `obligations` array in structured summary |
| Potential risks            | `risks` array                             |
| Missing information / gaps | `gaps` array                              |
| Recommended actions        | `recommendedActions` array                |

**Details:**

- Generated via Gemini structured JSON output with Zod validation
- Map-reduce pattern for long documents (chunk groups → partial summaries → merge)
- Results cached in `summaries` table (one per document)
- Each item includes supporting page numbers

### 4. User Interface

| Capability              | Implementation                                          |
| ----------------------- | ------------------------------------------------------- |
| PDF Upload              | `PdfUpload` component on home page                      |
| Processing Status       | `StatusBadge` + polling; workspace blocks until `ready` |
| Chat Interface          | `ChatPanel` with streaming tokens and citation cards    |
| Compliance Summary View | `SummaryView` with four categorized sections            |

**Details:**

- Responsive layout: side-by-side chat + summary on desktop; tabbed on mobile
- Supabase Auth login required for all routes

### 5. Backend APIs

| Endpoint                  | Method | Purpose                     |
| ------------------------- | ------ | --------------------------- |
| `/documents`              | POST   | Upload PDF                  |
| `/documents`              | GET    | List user's documents       |
| `/documents/:id`          | GET    | Document status / metadata  |
| `/documents/:id/messages` | GET    | Chat history                |
| `/documents/:id/chat`     | POST   | Streaming Q&A (SSE)         |
| `/documents/:id/summary`  | POST   | Generate compliance summary |
| `/documents/:id/summary`  | GET    | Retrieve cached summary     |
| `/health`                 | GET    | Health check                |

All document endpoints require `Authorization: Bearer <supabase_access_token>`.

See [API Reference](./api-reference.md) for request/response schemas.

### 6. Deployment

| Capability       | Implementation                                                                   |
| ---------------- | -------------------------------------------------------------------------------- |
| Cloud deployment | Vercel Services (`vercel.json`)                                                  |
| Public URL       | [https://complience-copilot.vercel.app/](https://complience-copilot.vercel.app/) |
| Reproducible     | `vercel.json`, env examples, Supabase migrations, CI pipeline                    |

## Repository & documentation

| Artifact                     | Location                                                        |
| ---------------------------- | --------------------------------------------------------------- |
| Source code                  | `frontend/`, `backend/`, `packages/shared/`                     |
| Infrastructure configuration | `vercel.json`, `supabase/migrations/`                           |
| Architecture overview        | [architecture.md](./architecture.md)                            |
| Technology choices           | [README](../README.md), [tradeoffs](./tradeoffs-and-roadmap.md) |
| Setup & deployment           | [README](../README.md)                                          |
| Design decisions & roadmap   | [tradeoffs-and-roadmap.md](./tradeoffs-and-roadmap.md)          |

## Engineering practices

- **Modular architecture** — clear separation across documents, ingestion, RAG, chat, summary, Gemini, and Supabase modules
- **Async ingestion** — upload latency decoupled from PDF processing time
- **Shared contracts** — `@ccp/shared` package keeps frontend and backend DTOs in sync
- **Vector search** — pgvector HNSW index for scalable similarity search
- **Defense in depth** — RLS policies plus application-level ownership checks
- **Typed APIs** — DTOs, Zod validation for AI output, global exception filter
- **Structured logging** — pino with auth header redaction
- **Git hooks** — Husky pre-commit (lint + format) and pre-push (build); see [README](../README.md#development)
- **CI** — GitHub Actions runs lint, typecheck, format check, and build on push/PR to `main`

Automated tests are planned; see [Tradeoffs & Roadmap](./tradeoffs-and-roadmap.md#future-improvements).

## Additional capabilities

| Capability                 | Status  | Notes                                                                       |
| -------------------------- | ------- | --------------------------------------------------------------------------- |
| Multi-document support     | ✅      | Users can upload and manage multiple PDFs                                   |
| Authentication             | ✅      | Supabase email/password auth                                                |
| Background processing      | ✅      | Fire-and-forget ingestion after upload                                      |
| Streaming responses        | ✅      | SSE chat endpoint                                                           |
| Advanced RAG techniques    | Partial | Similarity gate, page-aware chunking, citation alignment; reranking planned |
| Evaluation framework       | Planned | See roadmap                                                                 |
| Monitoring & observability | Partial | pino structured logs; APM/tracing planned                                   |
| Infrastructure as Code     | Partial | SQL migrations + `vercel.json`; Terraform planned for production hardening  |
| CI/CD pipeline             | ✅      | GitHub Actions                                                              |

## Known limitations

Current scope prioritizes a focused, maintainable product. Planned improvements and intentional omissions are documented in [Tradeoffs & Roadmap](./tradeoffs-and-roadmap.md), including:

- OCR for scanned PDFs
- Automated test suite
- Reranking / hybrid (BM25 + vector) retrieval
- Rate limiting and usage quotas
- Document deletion API
- Real-time push (WebSocket) for ingestion status — polling is used today
