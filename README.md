# Compliance Copilot

Upload a compliance PDF, ask grounded questions with citations (RAG), and generate a structured compliance risk summary.

**Stack:** Next.js · NestJS · Supabase (Postgres, pgvector, Storage, Auth) · Google Gemini

## Local setup

**Prerequisites:** Node.js ≥ 22, pnpm 10, a Supabase project, and a Gemini API key.

1. **Supabase** — Create a project and apply migrations from `supabase/migrations/` (or run `pnpm db:push` with the Supabase CLI linked).
2. **Env** — Each app has its own env file (server secrets stay on the API only):
   ```bash
   pnpm install
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```
   Fill in `backend/.env` (Supabase service role, Gemini key) and `frontend/.env` (public Supabase anon key + API URL).
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

Set env vars on each host separately — never copy `backend/.env` into Vercel.

**Backend** (Render, Railway, Fly.io, etc.):

| Variable                    | Required               |
| --------------------------- | ---------------------- |
| `SUPABASE_URL`              | yes                    |
| `SUPABASE_SERVICE_ROLE_KEY` | yes                    |
| `SUPABASE_STORAGE_BUCKET`   | yes                    |
| `GEMINI_API_KEY`            | yes                    |
| `NODE_ENV`                  | `production`           |
| `API_PORT`                  | host default or `4000` |
| `CORS_ORIGINS`              | your Vercel URL        |

**Frontend** (Vercel — `NEXT_PUBLIC_*` only):

| Variable                        | Required                 |
| ------------------------------- | ------------------------ |
| `NEXT_PUBLIC_API_URL`           | yes (production API URL) |
| `NEXT_PUBLIC_SUPABASE_URL`      | yes                      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes                      |
