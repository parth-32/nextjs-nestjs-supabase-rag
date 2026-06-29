# RAG Implementation

Compliance Copilot uses a classic **retrieve-then-generate** pipeline backed by pgvector and Google Gemini embeddings.

## Pipeline overview

```
PDF → per-page text → chunk → embed (batch) → store
Question → embed query → cosine search → gate → prompt → stream answer → citations
```

## 1. Text extraction

**Library:** `unpdf` (serverless-friendly pdf.js build)

**Strategy:** Extract text **per page** so every chunk can cite a page number.

```typescript
// backend/src/ingestion/pdf-extractor.ts
const { totalPages, text } = await extractText(pdf, { mergePages: false });
```

**Limitation:** Text-based extraction only. Scanned/image PDFs without a text layer return empty content and fail ingestion with a clear error.

## 2. Chunking strategy

**File:** `backend/src/ingestion/chunker.ts`

Page-aware recursive chunking:

1. **Segment** each page into paragraphs, then sentences, then hard character splits if a segment still exceeds the target size.
2. **Pack** segments greedily into chunks up to `targetTokens` (800).
3. **Overlap** ~120 tokens of trailing text into the next chunk so context spanning a boundary remains retrievable.

| Constant               | Value | Purpose                                              |
| ---------------------- | ----- | ---------------------------------------------------- |
| `CHUNK_TARGET_TOKENS`  | 800   | ~3,200 chars per chunk                               |
| `CHUNK_OVERLAP_TOKENS` | 120   | Cross-boundary context                               |
| `CHARS_PER_TOKEN`      | 4     | Lightweight token estimate (no tokenizer dependency) |

Each chunk records:

- `content` — joined segment text
- `page` — page number of the first segment (citation page)
- `chunk_index` — stable ordering within the document
- `token_count` — estimated size

## 3. Embedding

**Model:** `gemini-embedding-001` at 768 dimensions

| Task type            | Used for                          |
| -------------------- | --------------------------------- |
| `RETRIEVAL_DOCUMENT` | Chunk embeddings during ingestion |
| `RETRIEVAL_QUERY`    | Query embedding at chat time      |

Vectors are **L2-normalized** after embedding (required for truncated dimensionality). Stored in Postgres as `vector(768)` and indexed with **HNSW** (`vector_cosine_ops`).

Ingestion embeds in batches of 50 (`EMBED_BATCH_SIZE`) to balance API throughput and memory.

## 4. Retrieval

**RPC:** `match_chunks(query_embedding, p_document_id, match_count)`

Returns top-k chunks by **cosine similarity** scoped to a single document:

```sql
1 - (c.embedding <=> query_embedding) as similarity
```

| Constant    | Value |
| ----------- | ----- |
| `TOP_K`     | 5     |
| `MIN_SCORE` | 0.45  |

Similarity scores are in `[0, 1]` where 1 is most similar.

## 5. Hallucination handling

Three layers prevent answers not grounded in the document:

### Layer 1: Retrieval gate

Before calling the LLM, the chat service checks whether the top retrieved chunk clears `MIN_SCORE` (0.45):

```typescript
const grounded = chunks.length > 0 && top >= this.retrieval.minScore;
if (!grounded) {
  answer = NOT_FOUND_MESSAGE; // "I couldn't find information about that in this document."
}
```

This avoids generating plausible-sounding but ungrounded answers when retrieval finds nothing relevant.

### Layer 2: Prompt constraints

The system instruction (`CHAT_SYSTEM_INSTRUCTION`) enforces:

- Use **only** provided context
- Cite pages inline as `(page N)` or `(pages N, M)`
- Reply with the exact not-found message when context is insufficient
- No legal advice or speculation

### Layer 3: Citation suppression

If the model itself returns the not-found message, citations are **not** attached (prevents misleading source cards).

## 6. Prompt design

### Chat prompt

```
Context:
[page 4]
<chunk text>

---

[page 7]
<chunk text>

Question: <user question>

Answer (cite pages):
```

Retrieved chunks are ordered by similarity score and labeled with page numbers.

### Summary prompts

- **Per-group:** Extract obligations, risks, gaps, and recommended actions from labeled excerpts
- **Merge:** Deduplicate and consolidate partial summaries for long documents

Summary output is constrained via Gemini `responseSchema` and validated with Zod.

## 7. Citation strategy

**File:** `backend/src/rag/citations.ts`

Citations bridge retrieval scores, model inline references, and UI snippets:

1. Filter chunks below `MIN_SCORE`
2. Parse inline page references from the model answer (`(page 12)`, `(pages 3, 4)`)
3. Prefer chunks on cited pages; fall back to top retrieval scores
4. Keep the **best chunk per page** (highest similarity)
5. Extract a **question-centered snippet** (not just the chunk prefix) up to 280 chars
6. Return at most 4 citations (`MAX_CITATIONS`)

This aligns what the user sees in citation cards with what the model actually referenced.

## 8. Compliance summary (map-reduce)

For documents that exceed a single context window:

1. Load all chunks in `chunk_index` order
2. Group into batches of ~24,000 characters (`MAX_GROUP_CHARS`)
3. Generate a partial structured summary per group (Gemini JSON schema)
4. Merge partials with a second LLM call (fallback: naive concatenation on merge failure)
5. Upsert result to `summaries` table (cached — subsequent GET returns without re-generation)

Each summary item includes `text` and `pages[]`.

## 9. Streaming

Chat uses **Server-Sent Events** over `POST /documents/:id/chat`:

| Event type  | Payload                 |
| ----------- | ----------------------- |
| `token`     | Incremental answer text |
| `citations` | Final `Citation[]`      |
| `done`      | Persisted message ID    |
| `error`     | Error message           |

Document readiness is validated **before** switching to SSE mode so HTTP errors return normal JSON (not an open event stream).

## Tuning guide

| Symptom                       | Knob to adjust                                     |
| ----------------------------- | -------------------------------------------------- |
| Answers miss relevant content | Lower `MIN_SCORE` or increase `TOP_K`              |
| Too many irrelevant answers   | Raise `MIN_SCORE`                                  |
| Context cut off mid-thought   | Increase `CHUNK_OVERLAP_TOKENS`                    |
| Retrieval too coarse          | Decrease `CHUNK_TARGET_TOKENS`                     |
| Summary truncated             | Increase `MAX_GROUP_CHARS` or add more merge logic |

## Possible improvements

- **Reranking:** Cross-encoder or LLM rerank on top-k results
- **Hybrid search:** Combine pgvector with Postgres full-text search
- **Query expansion:** Rephrase or decompose complex questions
- **Conversation memory:** Include prior turns in retrieval context
- **Evaluation suite:** Golden Q&A pairs with recall/precision metrics
