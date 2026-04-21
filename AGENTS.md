# AGENTS.md

## Repo shape
- This is **not** a root workspace: there is no root `package.json` or `pnpm-workspace.yaml`. Work from `backend/` and `frontend/` separately, or use `pnpm -C backend ...` / `pnpm -C frontend ...` from repo root.
- `shared/` is source-only shared code. The frontend imports it directly via `@shared/* -> ../shared/src/*` (`frontend/vite.config.ts`, `frontend/tsconfig.app.json`). Update `shared/src/*` directly; there is no separate build/publish step.

## Local startup order
- Start Postgres first from repo root: `docker compose up -d`
- Copy env files before running anything: `backend/.env.example -> backend/.env`, `frontend/.env.example -> frontend/.env`
- Install deps per package: `pnpm -C backend install` and `pnpm -C frontend install`
- Run backend migrations **before** local API startup: `pnpm -C backend run migration:run`
- Start API: `pnpm -C backend run start:dev`
- Start web app: `pnpm -C frontend run dev`

## Backend facts that are easy to miss
- API base path is always `/api` (`backend/src/main.ts`). Default local URL is `http://localhost:3000/api`.
- CORS only allows origins from `FRONTEND_ORIGIN` (comma-separated, trailing slash trimmed). If frontend requests fail, verify that env first.
- `backend/src/database/data-source.ts` hard-fails without `DATABASE_URL`.
- Production startup already runs migrations (`backend/package.json`: `start`, `start:prod`). Do not add an extra manual migration step to those commands.
- `start:dev` watches Nest build output and runs from `dist/backend/src/main.js`; if you touch boot logic or migration scripts, remember the runtime path is under `dist/backend/src/*`.

## Auth/dev bypass
- Normal auth is Auth0 JWT on the backend plus Auth0 React on the frontend.
- Dev bypass only works when **both** sides are configured:
  - backend: `DEV_AUTH_BYPASS=true` and non-production `NODE_ENV`
  - frontend: `VITE_DEV_AUTH_BYPASS=true`
- In bypass mode, the frontend sends `x-dev-auth0-id`; the backend guard accepts it and synthesizes a dev user (`backend/src/auth/jwt-auth.guard.ts`, `frontend/src/api/client.ts`). If one side is missing, auth behavior will look broken.

## Verification
- Backend lint: `pnpm -C backend run lint`
- Backend unit tests: `pnpm -C backend run test`
- Backend single test file: `pnpm -C backend run test -- src/app.controller.spec.ts`
- Backend e2e: `pnpm -C backend run test:e2e`
- Backend single e2e file: `pnpm -C backend run test:e2e -- test/app.e2e-spec.ts`
- Frontend lint: `pnpm -C frontend run lint`
- There is currently **no frontend test setup** in `frontend/package.json`; do not invent `pnpm test` there.

## Useful structure
- Backend modules are organized by domain under `backend/src/` (`users`, `tournaments`, `players`, `matches`, `teams`, `player-teams`) and wired in `backend/src/app.module.ts`.
- Frontend routing lives in `frontend/src/App.tsx`; authenticated screens are nested under `ProtectedRoute` + `AppShell`.
- Frontend session bootstrap happens in `frontend/src/state/AppContext.tsx`: it wires Auth0 token retrieval, calls `apiClient.syncMe()`, then loads tournaments and role data.
