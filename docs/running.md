# Running the Application

> Originally §12 of CLAUDE.md. Load this doc when setting up the project for the first time, configuring env vars, or troubleshooting connectivity to the backend.

V1 runs **locally with Vite** — no Docker on the frontend yet. The backend is expected to be running separately (its own `docker-compose` from the backend repo), exposing the gateway at `http://localhost:3000`.

## 1. Prerequisites

- **Node.js** ≥ 20.x (LTS). Use `nvm use` if an `.nvmrc` is present.
- **npm** ≥ 10.x (ships with Node 20).
- **Backend running** at `http://localhost:3000` — bring it up first with the backend's `docker compose up` before starting the frontend, or the app will sit on retry banners.

## 2. First-time setup

```bash
git clone <repo-url> AegisCase_FE
cd AegisCase_FE
nvm use                    # if .nvmrc present
npm install
cp .env.example .env.local # then edit if backend is on a non-default URL
```

## 3. Environment variables

Vite only exposes vars prefixed with `VITE_`. All env files (`.env.local`, `.env.development`, `.env.production`) are gitignored except `.env.example` (committed).

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:3000` | API gateway base URL — axios `baseURL` |
| `VITE_SENTRY_DSN` | empty (disabled) | Sentry browser DSN; leave empty in dev |
| `VITE_ENV` | `development` | Tags Sentry events and toggles dev-only UI (`/styleguide`) |

Never put secrets in `VITE_*` — anything `VITE_`-prefixed is **inlined into the client bundle** and visible to users.

## 4. npm scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server on `http://localhost:5173` with HMR. Default during development. |
| `npm run build` | Type-check + Vite production build → `dist/`. |
| `npm run preview` | Serve the `dist/` build locally on `http://localhost:4173` to sanity-check the production bundle. |
| `npm run typecheck` | `tsc --noEmit` — no JS output, just type checking. Used by CI. |
| `npm run lint` | ESLint over `src/`. |
| `npm run lint:fix` | ESLint with `--fix`. |
| `npm run format` | Prettier write over `src/`. |
| `npm test` | Vitest in watch mode (CI uses `npm test -- --run`). |
| `npm run test:e2e` | Playwright E2E suite (Phase 9+). Requires backend running. |

## 5. Typical dev session

```bash
# Terminal 1 — backend (in the backend repo)
docker compose up

# Terminal 2 — frontend (this repo)
npm run dev
# → open http://localhost:5173, log in with a seeded Keycloak user
```

## 6. CORS / network sanity checks

- The backend gateway returns `Access-Control-Allow-Origin: ${CORS_ORIGIN || '*'}` (backend report §12.5). If the browser console shows CORS errors, set `CORS_ORIGIN=http://localhost:5173` on the backend before debugging the frontend.
- If `/auth/login` returns `503`, Keycloak is not up — check the backend's `docker compose ps`.
- If every authenticated request returns `401` immediately after login, verify the system clock is in sync (Keycloak rejects tokens with skewed `iat`/`exp`).

## 7. What is intentionally *not* here (V1)

- **No frontend `Dockerfile`** — added only when staging deployment is on the table.
- **No frontend `docker-compose.yml`** — see above.
- **No reverse proxy / nginx config** — Vite dev server is enough; production hosting is TBD (likely static hosting + CDN).

When deployment work begins, this section will grow with a Dockerfile (multi-stage Node → nginx) and CI build instructions; until then, keep it local.
