# my-utils

Internal utilities SPA: generators, JSON, workout diary, runtime properties, Grafana logs. [Refine](https://refine.dev) v5 + React + Vite.

**Agent/dev guide:** [AGENTS.md](AGENTS.md) · API: [../my-utils-api/AGENTS.md](../my-utils-api/AGENTS.md)

## Features

- **Generators** (`/`) — UUID, password, integer
- **JSON** (`/json`) — prettify / minify
- **Workout** (`/workout`) — training grid (API)
- **Properties** (`/properties`) — runtime settings
- **Logs** (`/observability`) — Grafana / Loki dashboard
- **Admin** (`/admin`) — sign-in required

## Getting started

```bash
cd utils/my-utils
npm install
npm run dev
```

| Script | Description |
|--------|-------------|
| `npm run dev` | Development server (`refine dev`) |
| `npm run build` | Typecheck + production build |
| `npm run start` | Serve production build |

## Project layout

- `src/App.tsx` — Refine providers and layout
- `src/components/AppRoutes.tsx` — routes
- `src/components/AppSider.tsx` — collapsible sidebar
- `src/config/resources.tsx` — sidebar menu entries
- `src/providers/` — auth (mock), access control, data (stub)
- `AGENTS.md` — guide for AI agents working in this repo
- `docs/REFINE.md` — Refine framework reference for this project

## Auth (development only)

Mock login: any non-empty email and password. Session is stored in `localStorage`. Not suitable for production.

## License

MIT
