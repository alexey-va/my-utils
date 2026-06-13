# AGENTS.md — my-utils

Vite + React + **Refine v5** SPA. Sibling API: `../my-utils-api`. **Tab registry** drives routes and menu.

## Layout

```
src/
├── config/features.tsx     — **single source**: tabs, paths, pages, auth
├── config/grafana*.ts      — Grafana iframe URLs + dashboard tabs
├── config/temporal.ts      — Temporal iframe URL + path persistence
├── api/                    — apiClient, endpoints.ts
├── features/<name>/        — one folder per tab
├── layout/                 — AppRoutes, RequireAuth, sider
├── providers/              — auth, accessControl (dataProvider = stub)
└── shared/                 — PageLayout, random utils
```

## Tabs (features.tsx)

| id | path | auth |
|----|------|------|
| generators | `/` | public |
| json | `/json` | public |
| workout | `/workout` | public |
| properties | `/properties` | public |
| observability | `/observability` | public (Grafana iframe) |
| temporal | `/temporal` | public (Temporal iframe) |
| dashboard | `/admin` | requires login |

## Commands

| Task | Command |
|------|---------|
| Dev | `npm run dev` — proxies `/api` to localhost:8080 |
| Build | `npm run build` |
| Prod | Jenkins **MyUtils**; **no** `VITE_API_BASE_URL` (same-origin `/api`) |

Working dir: `utils/my-utils/`.

## Add a tab

1. `src/features/<name>/<Name>Page.tsx`
2. One entry in `config/features.tsx`
3. API paths in `api/endpoints.ts` if needed
4. Use `featurePath("id")` / `PageLayout` — no hardcoded routes in components

## API client

- `apiClient` from `src/api/client.ts` — attaches Bearer JWT from `auth/session.ts`
- Prod: browser calls `https://utils.alexeyav.ru/api/...` via nginx
- Login: `POST /api/auth/login`; gated tabs use `requiresAuth: true` + `RequireAuth`

## Grafana / Logs tab

- `GrafanaPage` embeds same-origin `/grafana/` (first-party cookies)
- Default panel: dashboard `d/myutils-api-logs/...`; second tab: Loki Explore
- Override panels: `VITE_GRAFANA_DASHBOARDS` JSON at build time
- Do not set cross-origin `VITE_GRAFANA_URL` in prod Jenkins

## Temporal / iframe tab

- `TemporalPage` embeds same-origin `/temporal/` (nginx → `127.0.0.1:18233`)
- `temporal-ui` must set `TEMPORAL_UI_PUBLIC_PATH=/temporal`
- Do not set cross-origin `VITE_TEMPORAL_URL` in prod Jenkins

## Conventions

- Random: `shared/utils/random.ts`, not `Math.random`
- Paths: `config/paths.ts` or `featurePath()` only
- Refine details: `docs/REFINE.md` (framework only, not product logic)

Backend agent/Temporal docs: `../my-utils-api/AGENTS.md`.
