# FulboApp Frontend

React + Vite frontend for FulboApp.

## Environment variables

Create `frontend/.env` from `frontend/.env.example`:

```bash
cp .env.example .env
```

Required values:

- `VITE_API_URL` - backend API base URL (example: `http://localhost:3000/api`)
- `VITE_AUTH0_DOMAIN` - Auth0 tenant domain (example: `your-tenant.us.auth0.com`)
- `VITE_AUTH0_CLIENT_ID` - Auth0 SPA client id
- `VITE_AUTH0_AUDIENCE` - Auth0 API audience used by backend
- `VITE_AUTH0_REDIRECT_URI` - frontend URL after login

Optional:

- `VITE_DEV_AUTH_BYPASS` - `true` only for local backend bypass mode

## Local run

```bash
pnpm install
pnpm run dev
```

## Quality checks

```bash
pnpm run lint
pnpm run build
```

## Production notes

- Deploy this package from `frontend/`.
- Set all `VITE_*` environment variables in your host (for example Vercel).
- `VITE_API_URL` must point to your deployed backend `/api` URL.
