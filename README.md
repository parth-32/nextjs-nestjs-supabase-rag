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
- **Vercel Services (frontend + backend together):** One Vercel project via root [`vercel.json`](vercel.json) — steps below.
- **Vercel (separate projects):** Set root directory to `frontend` or `backend` and configure build commands in each package's `package.json` (no root `vercel.json` needed).

Set env vars on each host separately — never copy `backend/.env` into the frontend host.

### Vercel Services (single project)

Deploy both apps on one domain (e.g. `your-app.vercel.app` for the UI, `your-app.vercel.app/api` for the API).

> **If you see:** `Project framework is set to "services", but no services are declared`  
> **Cause:** Vercel **Root Directory** is set to `backend` (or `frontend`) instead of the repo root, so it never reads root [`vercel.json`](vercel.json).  
> **Fix:** Settings → General → Root Directory → **Reset to repo root** (empty / `.`). Or create a **new** Vercel project (do not reuse the old `*-api` backend-only project).

1. **Import** the repo at [vercel.com/new](https://vercel.com/new).
2. **Application Preset:** **Services** (not NestJS or Next.js alone).
3. **Root Directory:** leave **empty** (repo root). Must **not** be `backend` or `frontend`.
4. **vercel.json:** Root [`vercel.json`](vercel.json) defines `experimentalServices` for both apps.
5. **Environment variables** (Project Settings → one set for both services):

| Variable                        | Required | Notes                      |
| ------------------------------- | -------- | -------------------------- |
| `SUPABASE_URL`                  | yes      | backend only (server-side) |
| `SUPABASE_SERVICE_ROLE_KEY`     | yes      | backend only               |
| `SUPABASE_STORAGE_BUCKET`       | yes      | default `documents`        |
| `GEMINI_API_KEY`                | yes      | backend only               |
| `NODE_ENV`                      | yes      | `production`               |
| `NEXT_PUBLIC_SUPABASE_URL`      | yes      | frontend                   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes      | frontend                   |

Vercel auto-injects `NEXT_PUBLIC_BACKEND_URL` (e.g. `/api`) so the frontend talks to the API on the same origin — no CORS setup needed. You do **not** need `NEXT_PUBLIC_API_URL` unless overriding. For local dev, keep `NEXT_PUBLIC_API_URL=http://localhost:4000` in `frontend/.env`.

6. **Verify:** Open `/` (frontend), then `/api/health` (backend).

Run all services locally: `vercel dev -L` from the repo root (Vercel CLI 48.4.0+).

Docs: [Vercel Services](https://vercel.com/docs/services), [routing](https://vercel.com/docs/services/routing).

### Vercel (separate backend project)

If deploying the API as its own Vercel project (not Services), set root directory to `backend`, framework **NestJS**, enable **Include files outside the root directory**, and use build command:

`pnpm --filter @ccp/shared build && pnpm --filter @ccp/backend build`

**Backend env** (`compliance-copilot-api`):

| Variable                    | Required     |
| --------------------------- | ------------ |
| `SUPABASE_URL`              | yes          |
| `SUPABASE_SERVICE_ROLE_KEY` | yes          |
| `SUPABASE_STORAGE_BUCKET`   | yes          |
| `GEMINI_API_KEY`            | yes          |
| `NODE_ENV`                  | `production` |
| `CORS_ORIGINS`              | frontend URL |

**Frontend env** (`compliance-copilot-web` — `NEXT_PUBLIC_*` only):

| Variable                        | Required                 |
| ------------------------------- | ------------------------ |
| `NEXT_PUBLIC_API_URL`           | yes (production API URL) |
| `NEXT_PUBLIC_SUPABASE_URL`      | yes                      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes                      |
