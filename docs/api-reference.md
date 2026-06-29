# API Reference

Base URL:

| Environment                  | URL                                         |
| ---------------------------- | ------------------------------------------- |
| Local                        | `http://localhost:4000`                     |
| Production (Vercel Services) | `https://complience-copilot.vercel.app/api` |

All document endpoints require authentication.

## Authentication

Include the Supabase access token from the client session:

```
Authorization: Bearer <supabase_access_token>
```

The backend validates the token via `supabase.auth.getUser()`. Missing or invalid tokens return `401 Unauthorized`.

## Error responses

Non-2xx responses return JSON:

```json
{
  "statusCode": 400,
  "message": "Human-readable error message",
  "timestamp": "2026-06-29T12:00:00.000Z",
  "path": "/documents/..."
}
```

Validation errors may include a `errors` array with field-level details.

---

## Health

### `GET /health`

No authentication required.

**Response `200`:**

```json
{
  "status": "ok",
  "uptime": 123.456,
  "timestamp": "2026-06-29T12:00:00.000Z"
}
```

---

## Documents

### `POST /documents`

Upload a PDF for processing.

**Content-Type:** `multipart/form-data`

| Field  | Type     | Required |
| ------ | -------- | -------- |
| `file` | PDF file | yes      |

**Limits:** 20 MB max, `application/pdf` only.

**Response `201`:**

```json
{
  "id": "uuid",
  "status": "pending"
}
```

Ingestion runs asynchronously. Poll `GET /documents/:id` until `status` is `ready` or `failed`.

**Errors:**

- `400` — invalid file type, empty file, or DB error
- `401` — missing/invalid token

---

### `GET /documents`

List all documents for the authenticated user (newest first).

**Response `200`:**

```json
[
  {
    "id": "uuid",
    "filename": "policy.pdf",
    "status": "ready",
    "pageCount": 42,
    "error": null,
    "createdAt": "2026-06-29T12:00:00.000Z"
  }
]
```

---

### `GET /documents/:id`

Get a single document's metadata and processing status.

**Response `200`:** Same shape as a list item.

**Errors:**

- `403` — document belongs to another user
- `404` — document not found

---

## Chat

### `GET /documents/:id/messages`

Retrieve chat history for a document (oldest first).

**Response `200`:**

```json
[
  {
    "id": "uuid",
    "role": "user",
    "content": "What are the data retention requirements?",
    "citations": [],
    "createdAt": "2026-06-29T12:00:00.000Z"
  },
  {
    "id": "uuid",
    "role": "assistant",
    "content": "The policy requires 7-year retention (page 12).",
    "citations": [
      {
        "chunkId": "uuid",
        "page": 12,
        "snippet": "…records must be retained for seven years…",
        "score": 0.8234
      }
    ],
    "createdAt": "2026-06-29T12:00:01.000Z"
  }
]
```

---

### `POST /documents/:id/chat`

Ask a question. Returns a **Server-Sent Events** stream.

**Content-Type:** `application/json`

**Body:**

```json
{
  "question": "What are the data retention requirements?"
}
```

**Response `200`:** `Content-Type: text/event-stream`

Each event is a `data:` line with JSON:

```
data: {"type":"token","value":"The "}

data: {"type":"token","value":"policy "}

data: {"type":"citations","value":[{"chunkId":"...","page":12,"snippet":"...","score":0.82}]}

data: {"type":"done","messageId":"uuid"}
```

| Event type  | Fields              | When                               |
| ----------- | ------------------- | ---------------------------------- |
| `token`     | `value: string`     | Incremental answer text            |
| `citations` | `value: Citation[]` | After generation completes         |
| `done`      | `messageId: string` | Stream finished; message persisted |
| `error`     | `message: string`   | Generation failed                  |

**Pre-stream errors** (document not ready, not found, validation) return normal JSON with appropriate HTTP status — the response is **not** SSE in those cases.

**Errors:**

- `400` — document not `ready`, empty question, or validation failure
- `403` / `404` — ownership / not found

---

## Summary

### `POST /documents/:id/summary`

Generate a structured compliance summary. Returns cached result if one already exists.

**Response `200`:**

```json
{
  "documentId": "uuid",
  "obligations": [{ "text": "Maintain audit logs for 7 years", "pages": [12, 13] }],
  "risks": [{ "text": "Third-party processors lack explicit DPA references", "pages": [28] }],
  "gaps": [{ "text": "No breach notification timeline specified", "pages": [] }],
  "recommendedActions": [
    { "text": "Add explicit data processing agreements with vendors", "pages": [28, 29] }
  ],
  "createdAt": "2026-06-29T12:00:00.000Z"
}
```

**Errors:**

- `400` — document not `ready`
- `403` / `404` — ownership / not found

---

### `GET /documents/:id/summary`

Retrieve a previously generated summary.

**Response `200`:** Same shape as POST.

**Errors:**

- `404` — no summary generated yet

---

## Shared types

All DTOs are defined in `packages/shared/src/index.ts` and imported by both frontend and backend:

- `DocumentSummaryDto`
- `UploadDocumentResponse`
- `ChatMessageDto`
- `ChatStreamEvent`
- `Citation`
- `ComplianceSummaryDto`
- `SummaryItem`

API path constants are in `packages/shared/src/constants.ts` (`API_PATHS`).

## Frontend client

The Next.js app wraps these endpoints in `frontend/src/lib/api.ts`:

- `api.uploadDocument(file)`
- `api.listDocuments()`
- `api.getDocument(id)`
- `api.getMessages(id)`
- `api.streamChat(id, question, onEvent, signal?)`
- `api.getSummary(id)` / `api.generateSummary(id)`

All methods attach the Supabase Bearer token automatically.
