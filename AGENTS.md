# AGENTS.md — my-utils

Vite + React + **Refine v5** SPA. Sibling API: `../my-utils-api`. **Tab registry** drives routes and menu.

This is an independent Git repository. Backend changes belong in
`../my-utils-api` and must be committed and verified separately.

## Layout

```
src/
├── config/featureCatalog.tsx — **source of truth**: tabs, paths, menu metadata, auth gates
├── config/features.tsx     — maps catalog entries to page components
├── config/grafana*.ts      — Grafana iframe URLs + dashboard tabs
├── config/temporal.ts      — Temporal iframe URL + path persistence
├── api/                    — apiClient, endpoints.ts
├── features/<name>/        — one folder per tab
├── layout/                 — AppRoutes, RequireAuth, sider
├── providers/              — auth, accessControl (dataProvider = stub)
└── shared/                 — PageLayout, random utils
```

`src/features/generators/` and `src/features/json/` contain feature
implementations but are not active tabs unless registered in both catalog and
page mapping. Do not infer routes from folder names.

## Tabs (features.tsx)

| id | path | access |
|----|------|------|
| workout | `/` | public |
| properties | `/properties` | tab password |
| agents | `/agents` | tab password |
| observability | `/observability` | tab password (Grafana iframe) |
| temporal | `/workflows` | tab password (Temporal iframe → `/temporal/`) |
| dashboard | `/admin` | tab password + login |

## Commands

| Task | Command |
|------|---------|
| Dev | `npm run dev` — proxies `/api` to localhost:8080 |
| Build | `npm run build` |
| Prod | Woodpecker (`.woodpecker.yml`); деплой: `git push origin main`. **Не** задавай `VITE_API_BASE_URL=…/api` — пути уже с `/api/`. |

Working dir: `utils/my-utils/`.

There is currently no automated frontend test script. `npm run build` is the
required local gate; interaction changes additionally need a focused browser
smoke check.

## Add a tab

1. `src/features/<name>/<Name>Page.tsx`
2. One entry in `config/featureCatalog.tsx`
3. Map the page in `config/features.tsx`
4. API paths in `api/endpoints.ts` if needed
5. Use `featurePath("id")` / `PageLayout` — no hardcoded routes in components

## API client

- `apiClient` from `src/api/client.ts` — attaches Bearer JWT from `auth/session.ts`
- Prod: browser calls `https://utils.alexeyav.ru/api/...` via nginx
- Login: `POST /api/auth/login`; gated tabs use `requiresAuth: true` + `RequireAuth`
- `RequireTabPassword` is a client-side visibility gate, not server
  authorization. Never rely on it to protect a backend endpoint.

## Grafana / Logs tab

- `GrafanaPage` embeds same-origin `/grafana/` (first-party cookies)
- Default panel: dashboard `d/myutils-api-logs/...`; second tab: Loki Explore
- Override panels: `VITE_GRAFANA_DASHBOARDS` JSON at build time
- Do not set cross-origin `VITE_GRAFANA_URL` in prod Woodpecker build

## Temporal / iframe tab

- `TemporalPage` embeds same-origin `/temporal/` (host nginx → `127.0.0.1:18233`)
- `temporal-ui` must set `TEMPORAL_UI_PUBLIC_PATH=/temporal`
- SPA tab path is `/workflows` (not `/temporal` — avoids iframe recursion)
- Do not set cross-origin `VITE_TEMPORAL_URL` in prod Woodpecker build

## Design system (Linear)

| File | ~size | Scope |
|------|-------|--------|
| `DESIGN-APP.md` | ~350 lines | **SPA / dashboard** — primary for this repo |
| `DESIGN.md` | ~550 lines | Marketing / landing (`#010102` canvas) |
| `design/linear-tokens.css` | CSS vars | Token → `--linear-*` variables |

Sources: [awesome-design-md/linear.app](https://github.com/VoltAgent/awesome-design-md/tree/main/design-md/linear.app), [designmd.directory](https://designmd.directory/p/linear-design-md).

Cursor rule: `.cursor/rules/frontend-design-linear.mdc`. Fonts: Inter + JetBrains Mono (Google Fonts CDN).

Theme: `src/design/linearTokens.ts`, `src/theme/linearTheme.ts`, `src/design/linear-tokens.css`. No raw hex in components.

## Conventions

- Random: `shared/utils/random.ts`, not `Math.random`
- Paths: `config/paths.ts` or `featurePath()` only
- Refine details: `docs/REFINE.md` (framework only, not product logic)
- API paths: `api/endpoints.ts`; keep them aligned with backend controllers
- API payloads: shared frontend types/API modules; never spread anonymous
  response shapes through page components

## Change checklist

### UI-only

1. Keep route metadata in `featureCatalog.tsx`.
2. Reuse `PageLayout`, `AppPanel`, and Linear tokens.
3. Check desktop and narrow layouts.
4. Run `npm run build` and `git diff --check`.

### Cross-repo API change

1. Update and test the backend contract first.
2. Update `api/endpoints.ts`, API types, and the consuming feature.
3. Build the frontend.
4. Keep frontend and backend commits separate.

Push to `main` triggers production deployment. Do not push merely to verify a
change.

Backend agent/Temporal docs: `../my-utils-api/AGENTS.md`.
