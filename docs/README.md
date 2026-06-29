# Compliance Copilot — Documentation

Technical documentation for the RegVia **Compliance Copilot** assessment implementation.

| Document                                          | Description                                                          |
| ------------------------------------------------- | -------------------------------------------------------------------- |
| [Architecture](./architecture.md)                 | System design, component boundaries, data flow, and diagrams         |
| [Assessment Coverage](./assessment-coverage.md)   | How the implementation maps to the technical assessment requirements |
| [RAG Implementation](./rag-implementation.md)     | Chunking, retrieval, prompts, citations, and hallucination handling  |
| [API Reference](./api-reference.md)               | REST endpoints, auth, and streaming chat protocol                    |
| [Tradeoffs & Roadmap](./tradeoffs-and-roadmap.md) | Design decisions, assumptions, and future improvements               |

## Quick links

- **Live app:** [https://complience-copilot.vercel.app/](https://complience-copilot.vercel.app/)
- [Project README](../README.md) — setup, scripts, and deployment
- [Supabase migrations](../supabase/migrations/) — database schema and pgvector setup
- [Shared API types](../packages/shared/src/index.ts) — DTOs shared by frontend and backend

## Stack at a glance

| Layer      | Technology                                                      |
| ---------- | --------------------------------------------------------------- |
| Frontend   | Next.js 15, React, TanStack Query, Tailwind CSS                 |
| Backend    | NestJS, pino logging, class-validator                           |
| Database   | Supabase Postgres + pgvector (HNSW index)                       |
| Storage    | Supabase Storage (private PDF bucket)                           |
| Auth       | Supabase Auth (email/password)                                  |
| AI         | Google Gemini (`gemini-embedding-001`, `gemini-2.5-flash-lite`) |
| Deployment | Vercel Services (frontend + backend on one domain)              |
