# Compliance Copilot

Upload a compliance PDF, ask grounded questions with citations (RAG), and generate a structured compliance risk summary.

**Live app:** [https://complience-copilot.vercel.app/](https://complience-copilot.vercel.app/)  
**API health:** [https://complience-copilot.vercel.app/api/health](https://complience-copilot.vercel.app/api/health)

**Stack:** Next.js · NestJS · Supabase (Postgres, pgvector, Storage, Auth) · Google Gemini

## Documentation

Detailed docs in [`docs/`](docs/):

- [Architecture & diagrams](docs/architecture.md)
- [Feature overview](docs/feature-overview.md)
- [RAG pipeline](docs/rag-implementation.md)
- [API reference](docs/api-reference.md)
- [Tradeoffs & roadmap](docs/tradeoffs-and-roadmap.md)

## Local setup

**Prerequisites:** Node.js ≥ 22, pnpm 10, a Supabase project, and a Gemini API key.

1. Apply migrations from `supabase/migrations/` (or `pnpm db:push` with the Supabase CLI linked).
2. Copy env examples and fill in values:

   ```bash
   pnpm install
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

   Server secrets go in `backend/.env`; public Supabase keys and the local API URL go in `frontend/.env`.

3. Build shared types, then start both apps:

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
| `pnpm build`                             | Build all packages                   |
| `pnpm lint` / `pnpm typecheck`           | Lint and type-check                  |
| `pnpm format` / `pnpm format:check`      | Format code / verify formatting      |
| `pnpm db:push`                           | Push Supabase migrations             |

## Development

`pnpm install` runs Husky via the `prepare` script and installs Git hooks:

| Hook       | Script           | Checks              |
| ---------- | ---------------- | ------------------- |
| pre-commit | `pnpm precommit` | lint + format check |
| pre-push   | `pnpm prepush`   | full monorepo build |

CI (`.github/workflows/ci.yml`) runs lint, typecheck, format check, and build on every push and pull request to `main`.

## Deployment

Production uses [Vercel Services](https://vercel.com/docs/services) via root [`vercel.json`](vercel.json) — frontend at `/`, API at `/api` on one domain. Import the repo with **Root Directory** set to the repo root (not `frontend` or `backend`).

Set environment variables from [`backend/.env.example`](backend/.env.example) and [`frontend/.env.example`](frontend/.env.example) in Vercel project settings. See [deployment topology](docs/architecture.md#deployment-topology) for details.
