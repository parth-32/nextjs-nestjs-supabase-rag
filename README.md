# Compliance Copilot

Upload a compliance PDF, ask grounded questions with citations (RAG), and generate a structured compliance risk summary.

**Stack:** Next.js · NestJS · Supabase (Postgres, pgvector, Storage, Auth) · Google Gemini

## Local setup

**Prerequisites:** Node.js ≥ 22, pnpm 10, a Supabase project, and a Gemini API key.

1. **Supabase** — Create a project and apply migrations from `supabase/migrations/` (or run `pnpm db:push` with the Supabase CLI linked).
2. **Env** — Copy and fill in:
   ```bash
   pnpm install
   cp .env.example .env
   ```
   Set Supabase URL, service role key, anon key, and `GEMINI_API_KEY`. Both apps read from the root `.env`.
3. **Run:**

   ```bash
   pnpm --filter @ccp/shared build
   pnpm dev
   ```

   Open http://localhost:3000 (frontend on :3000, backend on :4000).

## Scripts

| Command                                  | Description                          |
| ---------------------------------------- | ------------------------------------ |
| `pnpm dev`                               | Run backend and frontend in parallel |
| `pnpm dev:backend` / `pnpm dev:frontend` | Run one app                          |
| `pnpm lint` / `pnpm typecheck`           | Lint and type-check                  |

## Deployment

- **Database:** Supabase (run migrations on your project).
- **Backend:** Deploy manually (e.g. Render, Railway, Fly.io) — run `pnpm --filter @ccp/shared build && pnpm --filter @ccp/backend build`, then `pnpm --filter @ccp/backend start:prod`.
- **Frontend:** Vercel with root directory `frontend` (see [`frontend/vercel.json`](frontend/vercel.json)).

Set production env vars in Render and Vercel; keep the service role key on the API only.
