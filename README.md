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
- **Render (frontend + backend):** Use [`render.yaml`](render.yaml) — steps below.
- **Frontend on Vercel (optional):** Root directory `frontend` (see [`frontend/vercel.json`](frontend/vercel.json)).
- **Backend on Vercel (optional):** Root directory `backend` (see [`backend/vercel.json`](backend/vercel.json)). Set **Framework Preset** to **Other** so the explicit `@vercel/node` config is used. Enable **Include files outside the root directory**.

Set env vars on each host separately — never copy `backend/.env` into the frontend host.

### Render

1. **Supabase** — Apply migrations (`pnpm db:push`). In **Authentication → URL Configuration**, set Site URL to `https://compliance-copilot-web-6o09.onrender.com` and add redirect URLs for your frontend host (and `http://localhost:3000/**` for local dev).
2. **Blueprint** — In [Render](https://dashboard.render.com): **New → Blueprint**, connect this repo, and fill in the prompted secrets (`SUPABASE_*`, `GEMINI_API_KEY`).
3. **Verify** — Backend health: `https://compliance-copilot-api-nw0w.onrender.com/health`. Then sign in, upload a PDF, and run a chat on the frontend URL.

Both services build from the **repo root** (monorepo). The API listens on Render’s `PORT`; locally it uses `API_PORT` (default `4000`).

| Service  | Render name              | URL                                                |
| -------- | ------------------------ | -------------------------------------------------- |
| Backend  | `compliance-copilot-api` | `https://compliance-copilot-api-nw0w.onrender.com` |
| Frontend | `compliance-copilot-web` | `https://compliance-copilot-web-6o09.onrender.com` |

If you rename services, update `CORS_ORIGINS`, `NEXT_PUBLIC_API_URL`, and Supabase Auth URLs to match.

### Vercel (backend)

In the Vercel project (**Settings → Environment Variables**), add the same backend secrets as Render:

| Variable                    | Required                            |
| --------------------------- | ----------------------------------- |
| `SUPABASE_URL`              | yes                                 |
| `SUPABASE_SERVICE_ROLE_KEY` | yes                                 |
| `SUPABASE_STORAGE_BUCKET`   | yes (default `documents`)           |
| `GEMINI_API_KEY`            | yes                                 |
| `NODE_ENV`                  | `production`                        |
| `CORS_ORIGINS`              | your frontend URL (comma-separated) |

Without these, the function crashes on cold start with `FUNCTION_INVOCATION_FAILED`. Check **Logs** in the Vercel dashboard if `/health` returns 500.

**Backend env** (`compliance-copilot-api`):

| Variable                    | Required                            |
| --------------------------- | ----------------------------------- |
| `SUPABASE_URL`              | yes                                 |
| `SUPABASE_SERVICE_ROLE_KEY` | yes                                 |
| `SUPABASE_STORAGE_BUCKET`   | yes                                 |
| `GEMINI_API_KEY`            | yes                                 |
| `NODE_ENV`                  | `production`                        |
| `CORS_ORIGINS`              | frontend URL (set in `render.yaml`) |

**Frontend env** (`compliance-copilot-web` — `NEXT_PUBLIC_*` only):

| Variable                        | Required                 |
| ------------------------------- | ------------------------ |
| `NEXT_PUBLIC_API_URL`           | yes (production API URL) |
| `NEXT_PUBLIC_SUPABASE_URL`      | yes                      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes                      |
