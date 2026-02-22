# FulboApp

Monorepo for a small soccer ("fulbo") tournaments app:

- `backend/`: NestJS + TypeORM API (PostgreSQL) with Auth0 JWT auth
- `frontend/`: React + Vite SPA using Auth0
- `shared/`: shared package (types/utilities)

## Quick start (local)

Prereqs:

- Node.js + `pnpm`
- Docker (for local Postgres)

1. Start Postgres (repo root):

```bash
docker compose up -d
```

2. Configure environment variables:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

3. Install deps:

```bash
pnpm -C backend install
pnpm -C frontend install
```

If you prefer, you can also run the same commands by `cd backend` / `cd frontend` first.

4. Run DB migrations and start the API:

```bash
pnpm -C backend run migration:run
pnpm -C backend run start:dev
```

5. Start the web app:

```bash
pnpm -C frontend run dev
```

Defaults:

- API: `http://localhost:3000/api`
- Web: `http://localhost:5173`
- Postgres: `localhost:5432` (from `docker-compose.yml`)

## Environment variables

- Backend: copy `backend/.env.example` -> `backend/.env`
  - Requires `DATABASE_URL`, `AUTH0_ISSUER_URL`, `AUTH0_AUDIENCE`, `FRONTEND_ORIGIN`
  - Optional: `AUTH0_MGMT_CLIENT_ID`, `AUTH0_MGMT_CLIENT_SECRET`
- Frontend: copy `frontend/.env.example` -> `frontend/.env`
  - Requires `VITE_API_URL`, `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`, `VITE_AUTH0_REDIRECT_URI`

More details:

- `backend/README.md`
- `frontend/README.md`

## Common scripts

Backend (`backend/`):

```bash
pnpm run start:dev
pnpm run lint
pnpm run build
pnpm run migration:generate
pnpm run migration:run
```

Frontend (`frontend/`):

```bash
pnpm run dev
pnpm run lint
pnpm run build
```

## Notes

- Production startup in `backend/` runs migrations before boot (`start` / `start:prod`).
- Auth0 values must match between backend (`AUTH0_*`) and frontend (`VITE_AUTH0_*`).
