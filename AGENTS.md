# AGENTS.md — my-utils

Internal developer utilities SPA: random generators and JSON tools behind a Refine shell. REST API: sibling project **`../my-utils-api`** (Kotlin/Spring Boot). Refine `dataProvider` is still a stub; auth and JSON can call the API via `apiClient`.

## Purpose

Browser-based toolkit for day-to-day dev tasks (UUID/password/number generation, JSON prettify/minify). Built on [Refine](https://refine.dev) v5 for routing, optional auth, access control, and layout; tool logic is client-side React unless you add API hooks.

## Architecture

```
utils/my-utils/
├── src/
│   ├── App.tsx
│   ├── api/                         — HTTP client for future backend
│   │   ├── client.ts                — apiRequest / apiClient (Bearer token)
│   │   ├── endpoints.ts             — path constants per feature
│   │   └── errors.ts
│   ├── auth/session.ts              — localStorage session helpers
│   ├── config/
│   │   ├── features.tsx             — **tab registry** (routes + menu + pages)
│   │   ├── resources.tsx            — Refine resources (derived from features)
│   │   ├── paths.ts, sidebar.ts, appBranding.ts, auth.ts
│   ├── features/                    — one folder per tab
│   │   ├── generators/
│   │   ├── json/
│   │   ├── admin/
│   │   └── auth/                    — Login (not in feature registry)
│   ├── layout/                      — AppRoutes, AppSider, RequireAuth, …
│   ├── shared/                      — cross-feature UI + utils
│   │   ├── components/            — PageLayout, AppPanel, CopyButton
│   │   ├── hooks/
│   │   └── utils/                   — random.ts, buildMenuRouteMap.ts
│   ├── providers/                   — auth, access control, data (stub)
│   └── types/                       — feature.ts, resource.ts
├── .env.example                     — VITE_API_BASE_URL
└── docs/REFINE.md
```

## Adding a new tab

1. Create `src/features/<name>/` with `<Name>Page.tsx` (and components/hooks as needed).
2. Register in `config/features.tsx` — one entry wires **sidebar**, **Refine resource**, and **route**.
3. Use `meta.requiresAuth: true` on the feature for login-gated tabs.
4. Add API paths in `api/endpoints.ts`; call `apiClient` from a feature hook (see `features/workout/`).
5. Optional: extend `providers/dataProvider.ts` for Refine CRUD on that resource.

## Routing and resources

Single source of truth: `config/features.tsx`. `config/resources.tsx` and `layout/AppRoutes.tsx` are derived — do not duplicate path strings elsewhere; use `config/paths.ts` or `featurePath(id)`.

| Feature id | Path | Auth |
|------------|------|------|
| `generators` | `/` | public |
| `json` | `/json` | public |
| `dashboard` | `/admin` | requires login |
| — | `/login` | public (not in registry) |

Alias: `/generators` → `/`.

## Backend API (`utils/my-utils-api`)

- Start API: `cd ../my-utils-api && ./gradlew bootRun` (port **8080**).
- Dev: Vite proxies `/api` — leave `VITE_API_BASE_URL` empty (see `.env.example`).
- Prod: set `VITE_API_BASE_URL` to the deployed API origin.
- Use `apiClient` from `src/api` — sends `Authorization: Bearer` from `auth/session` after login.
- Login: `POST /api/auth/login` → JWT + Redis session; `POST /api/auth/logout` revokes session.
- Docker stack: `cd ../my-utils-api && docker compose up -d --build` (API + Postgres + Redis).
- Restart API: `docker compose up -d --build api` in `my-utils-api/`.
- Refine `dataProvider` remains a stub until you add CRUD resources.

## Auth (optional, non-production)

- **Default:** app opens on Generators with no login wall.
- **Session:** `auth/session.ts` + `providers/authProvider.ts`.
- **`check`:** always `{ authenticated: true }` — shell never blocked.
- **Restricted routes:** `RequireAuth` via feature `requiresAuth`; guests redirect to `/` with toast (`AuthNotice`).
- **Menu:** `accessControlProvider` hides `requiresAuth` features when signed out.

## Commands

| Task | Command |
|------|---------|
| Dev | `npm run dev` |
| Build | `npm run build` |

Working directory: `utils/my-utils/`.

## Conventions

- **Paths:** `config/paths.ts` or `featurePath("id")` — not raw strings in components.
- **Random:** `shared/utils/random.ts` (`randInt`, `randPassword`), not `Math.random`.
- **Nested git:** `my-utils` has its own `.git`.

## Refine framework docs

**`docs/REFINE.md`** — Refine v5 index and my-utils-specific recipes.
