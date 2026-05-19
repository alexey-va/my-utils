# my-utils

Internal **Admin Panel** — browser utilities for developers: UUID/password/number generators and JSON prettify/minify. Built with [Refine](https://refine.dev) v5, React 19, Ant Design 5, and Vite 6.

## Features

- **Generators** (`/`) — UUID v4, random password, random integer
- **JSON** (`/json`) — prettify, minify, history (localStorage)
- **Admin** (`/admin`) — optional account area (sign in required)
- **Optional auth** — use the app without logging in; sign in from the sidebar to open restricted tabs

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
