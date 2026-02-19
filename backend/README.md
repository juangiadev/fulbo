# FulboApp Backend

NestJS + TypeORM API for tournaments, players, matches, teams, and standings.

## Environment variables

Create `backend/.env` from `backend/.env.example`:

```bash
cp .env.example .env
```

Required values:

- `DATABASE_URL` - PostgreSQL connection URL
- `AUTH0_ISSUER_URL` - Auth0 issuer URL ending with slash
- `AUTH0_AUDIENCE` - Auth0 API audience
- `FRONTEND_ORIGIN` - deployed frontend URL

Optional (recommended for complete user profile sync):

- `AUTH0_MGMT_CLIENT_ID` - Auth0 M2M client id with `read:users`
- `AUTH0_MGMT_CLIENT_SECRET` - Auth0 M2M client secret

Security values:

- `NODE_ENV=production` in production
- `DEV_AUTH_BYPASS=false` in production

## Local run (with migrations)

1. Start PostgreSQL from repo root:

```bash
docker compose up -d
```

2. Install dependencies and run migrations:

```bash
pnpm install
pnpm run migration:run
```

3. Start API:

```bash
pnpm run start:dev
```

API base URL: `http://localhost:3000/api`

## Migration scripts

```bash
pnpm run migration:create
pnpm run migration:generate
pnpm run migration:run
pnpm run migration:revert
```

Production startup (`start` and `start:prod`) runs migrations automatically before boot.

## Deploy checklist

- Provision Postgres (Neon/Supabase/etc.)
- Set backend env vars in your host
- Ensure Auth0 API and SPA are configured with matching audience/domain
- Run backend with `pnpm run start:prod`
- Point frontend `VITE_API_URL` to `https://<backend-host>/api`

## Quality checks

```bash
pnpm run lint
pnpm run build
```
