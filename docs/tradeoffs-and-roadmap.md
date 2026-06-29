# Tradeoffs & Roadmap

## Technology choices

### Why Next.js + NestJS (not a single full-stack framework)?

- **Separation of concerns:** The API owns AI orchestration, file processing, and database access. The frontend is a thin, auth-aware client.
- **Independent scaling:** On Vercel Services, frontend and backend deploy as separate services with distinct build steps.
- **Assessment fit:** Demonstrates API design as a first-class deliverable, not an afterthought behind server actions.

### Why Supabase (not a standalone vector DB)?

- **One platform** for Postgres, pgvector, auth, and file storage — fewer moving parts for a 2–4 day assessment.
- **pgvector + HNSW** provides production-grade approximate nearest-neighbor search without operating a separate vector service.
- **RLS policies** add defense-in-depth even though the API uses the service role.

### Why Gemini (not OpenAI / Claude)?

- Competitive embedding and generation quality at low cost.
- Native support for structured JSON output (`responseSchema`) simplifies compliance summary generation.
- Separate `RETRIEVAL_DOCUMENT` / `RETRIEVAL_QUERY` embedding task types improve retrieval accuracy.

### Why Vercel Services?

- Single-domain deploy (`/` + `/api`) eliminates CORS complexity in production.
- Serverless-friendly dependencies (`unpdf` instead of native PDF parsers).
- Reproducible via `vercel.json` with frontend and API on one project.

### Why a shared package (`@ccp/shared`)?

- Prevents frontend/backend DTO drift (status enums, API paths, stream event types).
- Single source of truth for document lifecycle states that must match DB check constraints.

## Key tradeoffs

| Decision                         | Benefit                                   | Cost                                                                 |
| -------------------------------- | ----------------------------------------- | -------------------------------------------------------------------- |
| Async in-process ingestion       | Fast upload response; simple architecture | Not durable across serverless cold starts; no retry queue            |
| Character-based token estimate   | No tokenizer dependency; fast chunking    | Less precise than tiktoken-style counting                            |
| Similarity threshold gate (0.45) | Blocks ungrounded answers                 | May reject borderline-relevant questions; requires tuning per corpus |
| Map-reduce summary               | Handles long documents                    | Multiple LLM calls = higher latency and cost                         |
| Cached summaries                 | Fast repeat access                        | Stale if document is re-processed (not currently supported)          |
| Service role on backend          | Simple server-side data access            | All authorization logic must live in the API (not RLS alone)         |
| Polling for ingestion status     | Simple client logic                       | Less responsive than WebSocket/SSE push                              |
| No OCR                           | Simpler pipeline                          | Scanned PDFs fail ingestion                                          |

## Assumptions

1. **Compliance PDFs are text-based** — policies, regulations, and contracts with selectable text layers.
2. **Single-tenant per user** — each user sees only their own documents; no org/team sharing.
3. **English-language documents** — chunking and stop-word filtering assume English prose.
4. **Low-to-moderate concurrency** — in-process ingestion is acceptable for demo/assessment scale.
5. **Gemini API availability** — external dependency; no fallback model configured.
6. **Output is informational, not legal advice** — summaries and answers are AI-generated extracts, not certified compliance opinions.

## What we intentionally did not build

Prioritized a **simple, well-engineered** solution over feature breadth (per assessment guidance):

- OCR / vision-based PDF parsing
- Document deletion or re-ingestion
- Admin dashboard or analytics
- Rate limiting and per-user quotas
- Automated test suite
- Reranking or hybrid retrieval
- Multi-user collaboration on a single document
- Terraform / Pulumi infrastructure

## Future improvements

### Near term (high value, low complexity)

- [ ] **Document deletion** — API endpoint + cascade cleanup of storage, chunks, messages, summary
- [ ] **Ingestion job queue** — BullMQ / Supabase Edge Functions / Vercel background jobs for durable processing
- [ ] **Unit and integration tests** — chunker, citation builder, API e2e with test containers
- [ ] **Rate limiting** — per-user upload and chat quotas
- [ ] **Better empty states** — guided first-run experience, sample document

### Medium term (RAG quality)

- [ ] **Reranking** — cross-encoder or LLM-based rerank on retrieved chunks
- [ ] **Hybrid search** — Postgres `tsvector` + pgvector fusion
- [ ] **Conversation context** — include recent chat turns in retrieval query
- [ ] **OCR fallback** — Gemini vision or Tesseract for scanned PDFs
- [ ] **Evaluation framework** — golden dataset with retrieval recall and answer faithfulness metrics

### Long term (production hardening)

- [ ] **Observability** — OpenTelemetry tracing, structured RAG metrics (retrieval score distributions, latency percentiles)
- [ ] **Multi-tenant orgs** — team workspaces, shared document libraries
- [ ] **Audit logging** — who asked what, when, with which sources
- [ ] **Infrastructure as Code** — Terraform for Supabase project provisioning
- [ ] **Containerized local dev** — Docker Compose with Postgres + pgvector for offline development
- [ ] **SOC2-minded secrets** — vault integration, key rotation, environment separation

## Maintenance notes

- Embedding dimension (768) in `supabase/migrations/0001_init.sql` **must** match `GEMINI.EMBEDDING_DIM` in `backend/src/constants.ts`
- Document status values in the DB check constraint **must** match `DOCUMENT_STATUS` in `packages/shared`
- After schema changes, run `pnpm db:types` to regenerate `frontend/src/types/database.types.ts`
