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

   Open http://localhost:3000 (web on :3000, API on :4000).

   Or with Docker: `docker compose up --build` (uses the same root `.env`).

## Scripts

| Command                         | Description                 |
| ------------------------------- | --------------------------- |
| `pnpm dev`                      | Run API and web in parallel |
| `pnpm dev:api` / `pnpm dev:web` | Run one app                 |
| `pnpm lint` / `pnpm typecheck`  | Lint and type-check         |

## Deployment

- **Database:** Supabase (run migrations on your project).
- **API:** Render via [`infra/render.yaml`](infra/render.yaml) and [`infra/Dockerfile.api`](infra/Dockerfile.api).
- **Web:** Vercel with root directory `apps/web` (see [`apps/web/vercel.json`](apps/web/vercel.json)).

Set production env vars in Render and Vercel; keep the service role key on the API only.
