# my-utils

Internal utilities SPA for workouts and operational tools. Built with [Refine](https://refine.dev) v5, React, TypeScript, Vite, and Ant Design. The sibling service is [`../my-utils-api`](../my-utils-api).

**Development guide:** [AGENTS.md](AGENTS.md) · **API guide:** [../my-utils-api/AGENTS.md](../my-utils-api/AGENTS.md)

## Product areas

| Area | Route | Access | Purpose |
| --- | --- | --- | --- |
| Workout | `/` | Public | Training grid and progress views backed by the API. |
| Properties | `/properties` | Tab password | Runtime application settings. |
| Agents | `/agents` | Tab password | Agent memory and conversation history. |
| Grafana | `/observability` | Tab password | Same-origin Grafana and Loki logs. |
| Temporal | `/workflows` | Tab password | Embedded Temporal UI. |
| Admin panel | `/admin` | Tab password + sign-in | Authenticated administration. |

Production is served at `https://utils.alexeyav.ru`; nginx exposes API requests under `/api`, Grafana under `/grafana/`, and Temporal under `/temporal/`.

## Local development

```bash
cd utils/my-utils
npm install
npm run dev
```

The development server proxies `/api` to `http://localhost:8080`. Start the API stack separately from `../my-utils-api` when working on API-backed screens.

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Refine/Vite development server. |
| `npm run build` | Type-check and create a production build. |
| `npm run start` | Serve the production build locally. |

## Code map

```text
src/
├── api/          HTTP client, endpoint definitions, and API types
├── auth/         JWT session handling
├── config/       Feature catalog, route paths, and integration settings
├── design/       Linear design tokens
├── features/     One folder per product area
├── layout/       App shell, routes, sidebar, and access gates
├── providers/    Refine auth, access-control, and data providers
├── shared/       Reusable UI components, hooks, and utilities
└── theme/        Ant Design theme mapped to the design tokens
```

`src/config/featureCatalog.tsx` is the source of truth for sidebar metadata and route paths. `src/config/features.tsx` maps that metadata to page components. Use `featurePath()` instead of hard-coding internal routes.

Folders under `src/features/` are not automatically active product areas.
Only entries registered in `featureCatalog.tsx` and mapped in `features.tsx`
become routes.

## Documentation

| Document | Purpose |
| --- | --- |
| [AGENTS.md](AGENTS.md) | development rules and change checklists |
| [docs/README.md](docs/README.md) | documentation index and ownership |
| [DESIGN-APP.md](DESIGN-APP.md) | application/dashboard design system |
| [DESIGN.md](DESIGN.md) | marketing/landing visual reference |
| [docs/REFINE.md](docs/REFINE.md) | Refine framework notes |
| [../my-utils-api/docs/UTILS-WORKSPACE.md](../my-utils-api/docs/UTILS-WORKSPACE.md) | frontend/backend contract |

## Verification

```bash
npm run build
git diff --check
```

The repository currently has no automated frontend test script. For
interaction-heavy changes, add focused tests when introducing a test runner or
perform an explicit browser smoke check in addition to the production build.

## Deployment

Pushes to `main` run the Woodpecker pipeline. A push is a production action,
not part of local verification.

Do not set `VITE_API_BASE_URL` with a trailing `/api`: API endpoint definitions
already begin with `/api/`, and production uses same-origin nginx routing.

## License

MIT
