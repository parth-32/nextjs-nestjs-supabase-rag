# Assessment Coverage

This document maps the [RegVia Technical Assessment](../Technical%20Assessment%20.pdf) requirements to the current implementation.

## Core requirements

### 1. Document Upload & Processing

| Requirement              | Status | Implementation                                                       |
| ------------------------ | ------ | -------------------------------------------------------------------- |
| Upload a PDF             | ✅     | `POST /documents` with `multipart/form-data` (`DocumentsController`) |
| Extract and process text | ✅     | `unpdf` per-page extraction (`pdf-extractor.ts`)                     |
| Store processed content  | ✅     | Chunks + embeddings in `chunks` table; raw PDF in Supabase Storage   |

**Details:**

- Max upload size: 20 MB (`DEFAULT_MAX_UPLOAD_BYTES`)
- MIME validation: `application/pdf` only
- Processing is **asynchronous** — upload returns immediately with `pending` status; client polls `GET /documents/:id`
- Scanned/image-only PDFs fail gracefully with a clear error message

### 2. AI-Powered Question Answering (RAG)

| Requirement                   | Status | Implementation                                                                |
| ----------------------------- | ------ | ----------------------------------------------------------------------------- |
| Answers from document only    | ✅     | System prompt restricts to provided context; low-similarity gate              |
| Retrieves relevant chunks     | ✅     | pgvector cosine search via `match_chunks` RPC (top-5)                         |
| Source references / citations | ✅     | Inline page citations in answer + structured `Citation[]` with snippets       |
| Handles missing information   | ✅     | Similarity threshold (0.45) short-circuits to deterministic not-found message |

See [RAG Implementation](./rag-implementation.md) for full detail.

### 3. Compliance Risk Summary

| Requirement                | Status | Implementation                            |
| -------------------------- | ------ | ----------------------------------------- |
| Key compliance obligations | ✅     | `obligations` array in structured summary |
| Potential risks            | ✅     | `risks` array                             |
| Missing information / gaps | ✅     | `gaps` array                              |
| Recommended actions        | ✅     | `recommendedActions` array                |

**Details:**

- Generated via Gemini structured JSON output with Zod validation
- Map-reduce pattern for long documents (chunk groups → partial summaries → merge)
- Results cached in `summaries` table (one per document)
- Each item includes supporting page numbers

### 4. User Interface

| Requirement             | Status | Implementation                                          |
| ----------------------- | ------ | ------------------------------------------------------- |
| PDF Upload              | ✅     | `PdfUpload` component on home page                      |
| Processing Status       | ✅     | `StatusBadge` + polling; workspace blocks until `ready` |
| Chat Interface          | ✅     | `ChatPanel` with streaming tokens and citation cards    |
| Compliance Summary View | ✅     | `SummaryView` with four categorized sections            |

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

### 6. Deployment

| Requirement      | Status | Implementation                                                                   |
| ---------------- | ------ | -------------------------------------------------------------------------------- |
| Cloud deployment | ✅     | Vercel Services (`vercel.json`)                                                  |
| Public URL       | ✅     | [https://complience-copilot.vercel.app/](https://complience-copilot.vercel.app/) |
| Reproducible     | ✅     | `vercel.json`, env examples, Supabase migrations, CI pipeline                    |

## Submission requirements

| Item                             | Status | Location                                                       |
| -------------------------------- | ------ | -------------------------------------------------------------- |
| Source code (frontend + backend) | ✅     | `frontend/`, `backend/`                                        |
| Infrastructure configuration     | ✅     | `vercel.json`, `supabase/migrations/`                          |
| Architecture overview            | ✅     | [architecture.md](./architecture.md)                           |
| Technology choices               | ✅     | [README](./README.md), [tradeoffs](./tradeoffs-and-roadmap.md) |
| Setup instructions               | ✅     | [README](../README.md)                                         |
| Deployment instructions          | ✅     | [README](../README.md)                                         |
| Tradeoffs and assumptions        | ✅     | [tradeoffs-and-roadmap.md](./tradeoffs-and-roadmap.md)         |
| Future improvements              | ✅     | [tradeoffs-and-roadmap.md](./tradeoffs-and-roadmap.md)         |
| Architecture diagram             | ✅     | [architecture.md](./architecture.md) (Mermaid)                 |
| Demo video                       | ❌     | Not included in repo                                           |

## Evaluation criteria alignment

### Architecture & System Design (25%)

- Clear module separation (documents, ingestion, RAG, chat, summary, gemini, supabase)
- Async ingestion decouples upload latency from processing time
- Shared `@ccp/shared` package for API contracts
- pgvector HNSW index for scalable similarity search
- RLS + application-level ownership checks

### Code Quality & Engineering Practices (20%)

- Typed DTOs, Zod validation for AI output, global exception filter
- Structured logging with pino (auth header redaction)
- Husky pre-commit (lint + format) and pre-push (build)
- GitHub Actions CI
- No unit tests yet (gap — see roadmap)

### AI / RAG Implementation (20%)

- Page-aware chunking with overlap
- Similarity threshold gate before generation
- Prompt engineering for grounded answers and inline page citations
- Citation builder aligned with model output and retrieval scores

### Product Thinking & UX (15%)

- Document list with status badges and refresh
- Processing state with clear messaging
- Streaming chat with typing indicator
- Summary organized into four actionable categories with page refs

### Deployment & DevOps (10%)

- Vercel Services single-project deploy
- Env validation on backend startup (`env.validation.ts`)
- Secrets scoped to backend only
- CI pipeline on push/PR

### Documentation & Communication (10%)

- README + this `docs/` folder
- Inline code comments on non-obvious design choices (ingestion, SSE error handling, citation logic)

## Bonus features

| Bonus                      | Status  | Notes                                                                                   |
| -------------------------- | ------- | --------------------------------------------------------------------------------------- |
| Multi-document support     | ✅      | Users can upload and manage multiple PDFs                                               |
| Authentication             | ✅      | Supabase email/password auth                                                            |
| Background processing      | ✅      | Fire-and-forget ingestion after upload                                                  |
| Streaming responses        | ✅      | SSE chat endpoint                                                                       |
| Advanced RAG techniques    | Partial | Similarity gate, page-aware chunking, citation alignment; no reranking or hybrid search |
| Evaluation framework       | ❌      | Not implemented                                                                         |
| Monitoring & Observability | Partial | pino structured logs; no APM/tracing                                                    |
| Infrastructure as Code     | Partial | SQL migrations + `vercel.json`; no Terraform/Pulumi                                     |
| CI/CD pipeline             | ✅      | GitHub Actions                                                                          |
| Containerization           | ❌      | Not containerized (Vercel serverless)                                                   |

## Gaps and intentional omissions

These were deprioritized to keep the solution focused and maintainable:

- OCR for scanned PDFs
- Automated test suite
- Demo video
- Reranking / hybrid (BM25 + vector) retrieval
- Rate limiting and usage quotas
- Document deletion API
- Real-time push (WebSocket) for ingestion status — polling is used instead
