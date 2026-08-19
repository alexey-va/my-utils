# my-utils

Internal utilities SPA for workouts and operational tools. Built with [Refine](https://refine.dev) v5, React, TypeScript, Vite, and Ant Design. The sibling service is [`../my-utils-api`](../my-utils-api).

**Development guide:** [AGENTS.md](AGENTS.md) · **API guide:** [../my-utils-api/AGENTS.md](../my-utils-api/AGENTS.md)

## Product areas

| Area | Route | Access | Purpose |
| --- | --- | --- | --- |
| Workout | `/` | Public | Training grid and progress views backed by the API. |
| Properties | `/properties` | Administrator | Runtime application settings. |
| Agents | `/agents` | Administrator | Isolated Workout AI sandbox chats, tool calls, and agent memory. |
| WireGuard | `/wireguard` | Administrator | Relay, peer credentials, handshake, and traffic management. |
| Grafana | `/observability` | Administrator | Same-origin Grafana and Loki logs. |
| Temporal | `/workflows` | Administrator | Embedded Temporal UI. |
| Admin panel | `/admin` | Administrator | User and service administration. |

Guests can use Workout without signing in. Registration creates a regular
`USER` account, which can also use Workout and manage its own credentials.
All operational areas require an `ADMIN` role enforced by the API, not only by
the browser. The bootstrap administrator must replace its initial password
before opening administrative routes.

Opening the public Workout page sends one best-effort, value-free `page_view`
event to `/api/client-events`. The backend enriches it with the verified IP and
browser headers for the `Workout Visitors` Grafana dashboard. A failed
telemetry request is ignored and never blocks the UI.
The Grafana tab opens the `Workout Visitors` dashboard by default.

WireGuard credentials are fetched only on demand. The QR is rendered locally
in the browser, never sent to an external QR service, and cleared from page
state when its modal closes. The VPN page polls live peer counters, shows
download/upload history for up to 30 days, and reports whether Russian IPv4
destinations use the direct `utils` route while other traffic uses Veesp. The
history can switch between direction and RU/non-RU route splits; the page also
shows the relay's current route loss and RTT probes. Peer rows refresh every
five seconds, derive live transfer rates from consecutive agent timestamps,
and show a compact one-hour traffic preview. Host
topology and installation scripts live in
[`../my-utils-api/ops/wireguard/`](../my-utils-api/ops/wireguard/).

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
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Type-check and create a production build. |
| `npm test` | Run the focused Vitest suite. |
| `npm run start` | Preview the production build locally. |

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
npm exec eslint -- src
npm test
npm run build
git diff --check
```

Interaction-heavy changes also require an explicit desktop and narrow-layout
browser smoke check.

## Deployment

Pushes to `main` run the Woodpecker pipeline. A push is a production action,
not part of local verification.

The application is currently used only by its author. A short production
downtime during a straightforward deployment is acceptable; do not add
high-availability machinery solely to avoid that brief interruption.

Do not set `VITE_API_BASE_URL` with a trailing `/api`: API endpoint definitions
already begin with `/api/`, and production uses same-origin nginx routing.

## License

MIT
