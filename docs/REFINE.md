# Refine — documentation reference (my-utils)

Offline-friendly index and API notes for **[Refine](https://refine.dev)** v5, as used in this project. Full text lives on the official site; this file maps every major doc section and summarizes APIs you touch here.

**Official docs:** https://refine.dev/core/docs/  
**GitHub:** https://github.com/refinedev/refine  
**Tutorial:** https://refine.dev/core/tutorial/essentials/intro/

---

## What Refine is

Refine is a **React meta-framework for CRUD-heavy apps** (admin panels, internal tools, dashboards). It is **headless**: business logic (auth, data, routing, access control) is separated from UI. You bring your own routes and pages; Refine supplies providers, hooks, and optional UI kits.

**This project uses:**

| Package | Version (package.json) | Role |
|---------|------------------------|------|
| `@refinedev/core` | ^5.0.0 | `<Refine>`, providers, hooks, `<Authenticated>` |
| `@refinedev/react-router` | ^2.0.0 | `routerProvider` for React Router v7 |

**Also in stack (not Refine):** React 19, Vite 6, Ant Design 5,
`react-router-dom` 7, Vitest, and Tailwind 4. The app uses native Ant Design
layout and components rather than the optional `@refinedev/antd` package.

---

## How my-utils uses Refine

```
BrowserRouter
  └── ConfigProvider (antd theme — outside Refine)
        └── <Refine
              routerProvider
              authProvider
              accessControlProvider
              dataProvider
              resources
            >
              └── <Layout>
                    ├── AppSider
                    └── AppRoutes
                          ├── feature routes
                          ├── login / register / account
                          └── AuthNotice
```

| Concern | Location in repo |
|---------|------------------|
| Refine shell | `src/App.tsx` |
| Routes | `src/layout/AppRoutes.tsx` |
| Auth | `src/providers/authProvider.ts`, `src/auth/session.ts` |
| Access control | `src/providers/accessControlProvider.ts` |
| Route guards | `src/layout/RequireAuth.tsx`, `src/layout/RequireAdmin.tsx` |
| Data (stub) | `src/providers/dataProvider.ts` |
| Sidebar menu | `src/config/featureCatalog.tsx`, `src/config/resources.tsx` |
| Custom sider | `src/layout/AppSider.tsx` |
| Ant Design theme | `src/theme/linearTheme.ts` |

**No global `<Authenticated>` wrapper** — the app shell and Workout remain
public. Login, registration, and account management use the real API.
Operational routes are hidden and guarded through `requiresAdmin`,
`accessControlProvider`, and `RequireAdmin`; the API separately enforces the
administrator role.

**Custom pages** (Generators, JSON) are plain React components; they do not use `useList` / `useForm` unless you add CRUD later.

---

## Local commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite development server |
| `npm run build` | `tsc && vite build` — production build |
| `npm test` | Focused Vitest suite |
| `npm run start` | `vite preview` — preview the production build |
| `npm create refine-app@latest` | Scaffold new app |

The Refine CLI and devtools packages are intentionally not installed.

---

## `<Refine>` component (entry point)

**Docs:** https://refine.dev/core/docs/core/refine-component/

Main props:

| Prop | Purpose |
|------|---------|
| `dataProvider` | API adapter (required for data hooks) |
| `authProvider` | Login / session checks |
| `routerProvider` | React Router / Next / Remix bindings |
| `resources` | Menu + route metadata for CRUD resources |
| `accessControlProvider` | Permissions (optional) |
| `notificationProvider` | Toasts (optional; Ant Design has default) |
| `i18nProvider` | Translations (optional) |
| `options` | e.g. `{ syncWithLocation: true }` — sync list filters with URL |

**Resources** define sidebar entries and action paths:

```ts
{
  name: "posts",           // API resource name
  list: "/posts",
  create: "/posts/create",
  edit: "/posts/edit/:id",
  show: "/posts/show/:id",
  meta: { label: "Posts", icon: <Icon /> },
}
```

- `name` — used in data provider URLs and hooks.
- `identifier` — disambiguates multiple resources with same `name`.
- `meta` — arbitrary; often `label`, `icon`, `dataProviderName`.

**Docs:** https://refine.dev/core/docs/core/refine-component/#resources

---

## Auth provider

**Docs:** https://refine.dev/core/docs/authentication/auth-provider/

### Interface

```ts
import type { AuthProvider } from "@refinedev/core";

const authProvider: AuthProvider = {
  login: async (params) => AuthActionResponse,
  check: async (params) => CheckResponse,
  logout: async (params) => AuthActionResponse,
  onError: async (params) => OnErrorResponse,
  // optional:
  register, forgotPassword, updatePassword, getPermissions, getIdentity,
};
```

### Required methods

| Method | Return shape | Used by |
|--------|--------------|---------|
| `login` | `{ success, redirectTo?, error? }` | `useLogin` |
| `check` | `{ authenticated, redirectTo?, logout?, error? }` | `useIsAuthenticated`, `<Authenticated>` |
| `logout` | `{ success, redirectTo?, error? }` | `useLogout` |
| `onError` | `{ error?, redirectTo?, logout? }` | Global HTTP 401 handling |

### Auth hooks (`@refinedev/core`)

| Hook | Purpose |
|------|---------|
| `useLogin` | `mutate({ email, password })` |
| `useLogout` | `mutate()` |
| `useGetIdentity` | Current user (`getIdentity`) |
| `useIsAuthenticated` | Session check |
| `usePermissions` | `getPermissions` |
| `useRegister` / `useForgotPassword` / `useUpdatePassword` | Optional flows |

**Hook index:** https://refine.dev/core/docs/authentication/hooks/use-login/

### `<Authenticated>` component

**Docs:** https://refine.dev/core/docs/authentication/components/authenticated/

- Renders `children` when authenticated; otherwise `fallback` or redirect from `check`.
- **`key` is required** when multiple `<Authenticated>` exist or on route-level auth — forces remount so stale auth state does not flash wrong content.
- Props: `key`, `fallback`, `loading`, `redirectOnFail`, `appendCurrentPathToQuery`, `params`.

```tsx
<Authenticated key="authenticated" fallback={<Login />}>
  <PrivatePage />
</Authenticated>
```

---

## Data provider

**Docs:** https://refine.dev/core/docs/data/data-provider/

### Required methods

| Method | Params (main) | Returns |
|--------|---------------|---------|
| `getList` | `resource`, `pagination`, `sorters`, `filters`, `meta` | `{ data, total }` |
| `getOne` | `resource`, `id`, `meta` | `{ data }` |
| `create` | `resource`, `variables`, `meta` | `{ data }` |
| `update` | `resource`, `id`, `variables`, `meta` | `{ data }` |
| `deleteOne` | `resource`, `id`, `meta` | `{ data }` |
| `getApiUrl` | — | `string` |

### Optional methods

`getMany`, `createMany`, `updateMany`, `deleteMany`, `custom`

### Data hooks (`@refinedev/core`)

| Hook | Data method |
|------|-------------|
| `useList` / `useInfiniteList` | `getList` |
| `useOne` | `getOne` |
| `useMany` | `getMany` |
| `useCreate` | `create` |
| `useUpdate` | `update` |
| `useDelete` | `deleteOne` |
| `useCustom` / `useCustomMutation` | `custom` |
| `useInvalidate` | Cache invalidation |
| `useApiUrl` | `getApiUrl` |

**Hook index:** https://refine.dev/core/docs/data/hooks/use-list/

### Pre-built data packages

| Package | Docs |
|---------|------|
| Simple REST | https://refine.dev/core/docs/data/packages/simple-rest/ |
| REST (generic) | https://refine.dev/core/docs/data/packages/rest-data-provider/ |
| GraphQL | https://refine.dev/core/docs/data/packages/graphql/ |
| Supabase | https://refine.dev/core/docs/data/packages/supabase/ |
| Strapi v4 | https://refine.dev/core/docs/data/packages/strapi-v4/ |

### Multiple providers

```tsx
<Refine
  dataProvider={{
    default: defaultProvider,
    other: otherProvider,
  }}
  resources={[{ name: "x", meta: { dataProviderName: "other" } }]}
/>
```

---

## Router provider (React Router)

**Docs:** https://refine.dev/core/docs/routing/integrations/react-router/

Install: `npm i @refinedev/react-router react-router`

```tsx
import routerProvider from "@refinedev/react-router";
import { BrowserRouter, Routes, Route } from "react-router-dom";

<BrowserRouter>
  <Refine routerProvider={routerProvider} resources={[...]}>
    <Routes>...</Routes>
  </Refine>
</BrowserRouter>
```

Refine does not own your route tree — you define `Routes`; `resources` tell Refine paths for menu, breadcrumbs, and redirects.

### Routing hooks

| Hook | Purpose |
|------|---------|
| `useGo` | Programmatic navigation |
| `useBack` | History back |
| `useParsed` | Parsed route params |
| `useResourceParams` | Current resource + action from URL |
| `useNavigation` | Resource-aware navigation helpers |
| `useLink` | Link component factory |
| `useGetToPath` | Build path for resource action |

**Router provider:** https://refine.dev/core/docs/routing/router-provider/  
**v6 → v7 migration:** https://refine.dev/core/docs/routing/integrations/react-router/migration-guide-v6-to-v7/

---

## Ant Design integration

The application imports Ant Design directly. Refine remains headless and
provides resource, routing, identity, and access-control hooks.

Import reset CSS once (see `src/index.tsx`):

```ts
import "antd/dist/reset.css";
```

### Theming

The project passes `linearTheme` from `src/theme/linearTheme.ts` to Ant
Design's `ConfigProvider`.

---

## Access control (optional)

**Docs:** https://refine.dev/core/docs/authorization/access-control-provider/

- `accessControlProvider` + `<CanAccess>` + `useCan`
- Examples: Casbin, Cerbos, Permify

---

## Other providers (optional)

| Provider | Docs |
|----------|------|
| Notification | https://refine.dev/core/docs/notification/notification-provider/ |
| i18n | https://refine.dev/core/docs/i18n/i18n-provider/ |
| Live / Realtime | https://refine.dev/core/docs/realtime/live-provider/ |
| Audit log | https://refine.dev/core/docs/audit-logs/audit-log-provider/ |

---

## Guides and concepts

| Topic | URL |
|-------|-----|
| General concepts | https://refine.dev/core/docs/guides-concepts/general-concepts/ |
| Data fetching | https://refine.dev/core/docs/guides-concepts/data-fetching/ |
| Forms | https://refine.dev/core/docs/guides-concepts/forms/ |
| Tables | https://refine.dev/core/docs/guides-concepts/tables/ |
| Routing | https://refine.dev/core/docs/guides-concepts/routing/ |
| Authentication | https://refine.dev/core/docs/guides-concepts/authentication/ |
| Authorization | https://refine.dev/core/docs/guides-concepts/authorization/ |
| UI libraries | https://refine.dev/core/docs/guides-concepts/ui-libraries/ |
| Deployment | https://refine.dev/core/docs/guides-concepts/deployment/ |
| Existing projects | https://refine.dev/core/docs/guides-concepts/usage-with-existing-projects/ |

---

## Advanced tutorials

| Topic | URL |
|-------|-----|
| Access control | https://refine.dev/core/docs/advanced-tutorials/access-control/ |
| Auth0 / Azure AD | https://refine.dev/core/docs/advanced-tutorials/auth/auth0/ |
| Custom layout | https://refine.dev/core/docs/advanced-tutorials/custom-layout/ |
| Data provider filters | https://refine.dev/core/docs/advanced-tutorials/data-provider/handling-filters/ |
| Multi-level menu | https://refine.dev/core/docs/advanced-tutorials/multi-level-menu/ |
| Mutation mode | https://refine.dev/core/docs/advanced-tutorials/mutation-mode/ |
| List / table search | https://refine.dev/core/docs/advanced-tutorials/search/list-search/ |
| Upload (base64 / multipart) | https://refine.dev/core/docs/advanced-tutorials/upload/base64-upload/ |
| Realtime | https://refine.dev/core/docs/advanced-tutorials/real-time/ |
| Import / export | https://refine.dev/core/docs/guides-concepts/import-export/ |

---

## UI integrations (alternatives to Ant Design)

| UI kit | Introduction |
|--------|----------------|
| shadcn/ui | https://refine.dev/core/docs/ui-integrations/shadcn/introduction/ |
| Material UI | https://refine.dev/core/docs/ui-integrations/material-ui/introduction/ |
| Mantine | https://refine.dev/core/docs/ui-integrations/mantine/introduction/ |
| Chakra UI | https://refine.dev/core/docs/ui-integrations/chakra-ui/introduction/ |

---

## Packages and tools

| Package | URL |
|---------|-----|
| Package list | https://refine.dev/core/docs/packages/list-of-packages/ |
| TanStack Table | https://refine.dev/core/docs/packages/tanstack-table/introduction/ |
| React Hook Form | https://refine.dev/core/docs/packages/react-hook-form/introduction/ |
| Inferencer (scaffold UI) | https://refine.dev/core/docs/packages/inferencer/ |
| Command palette (kbar) | https://refine.dev/core/docs/packages/command-palette/ |

---

## Migration guides

| Guide | URL |
|-------|-----|
| Refine 4 → 5 | https://refine.dev/core/docs/migration-guide/4x-to-5x/ |
| Refine 3 → 4 | https://refine.dev/core/docs/migration-guide/3x-to-4x/ |
| Auth provider migration | https://refine.dev/core/docs/migration-guide/auth-provider/ |
| Router provider migration | https://refine.dev/core/docs/migration-guide/router-provider/ |
| Ant Design integration | https://refine.dev/core/docs/ui-integrations/ant-design/migration-guide/ |

---

## Examples and templates

| Resource | URL |
|----------|-----|
| Live examples | https://s.refine.dev/examples |
| Templates | https://refine.dev/core/templates/ |
| Quick start | https://refine.dev/core/docs/getting-started/quickstart/ |
| FAQ | https://refine.dev/core/docs/guides-concepts/faq/ |
| Interface references (types) | https://refine.dev/core/docs/core/interface-references/ |

---

## Core utilities (misc hooks)

| Hook / area | URL |
|-------------|-----|
| `useMenu` | https://refine.dev/core/docs/core/hooks/utilities/use-menu/ |
| `useBreadcrumb` | https://refine.dev/core/docs/core/hooks/utilities/use-breadcrumb/ |
| `useModal` | https://refine.dev/core/docs/core/hooks/utilities/use-modal/ |
| Buttons (CreateButton, etc.) | https://refine.dev/core/docs/core/hooks/utilities/buttons/ |
| Inferencer | https://refine.dev/core/docs/core/components/inferencer/ |

---

## Recipes for extending my-utils

### Add a CRUD resource backed by API

1. Implement real `dataProvider` (e.g. `@refinedev/simple-rest` or GraphQL package).
2. Add `resources` entry with `list` / `create` / `edit` / `show` paths.
3. Add routes in `src/layout/AppRoutes.tsx`.
4. Build custom Ant Design pages or explicitly add a compatible Refine UI integration.

### Add a menu item (custom page only)

1. Add metadata to `src/config/featureCatalog.tsx`.
2. Add the lazy page mapping to `src/config/features.tsx`.

### Add an administrator page

1. Set `requiresAdmin: true` in `src/config/featureCatalog.tsx`.
2. `AppRoutes` wraps it with `RequireAdmin`; `accessControlProvider` hides it
   from guests and regular users.
3. Protect every backing endpoint with the API's administrator role. The
   frontend guard is navigation UX, not a security boundary.

### Authentication contract

1. `authProvider` performs real login/logout against `/api/auth/*`.
2. Registration and credential changes live in the custom auth pages.
3. `apiClient` attaches the stored Bearer token. The server validates roles and
   can revoke user-bound sessions.

### Wire GraphQL

1. Add `@refinedev/graphql`, `graphql`, and `graphql-request` when an actual
   GraphQL endpoint is introduced.
2. Replace the stub in `dataProvider.ts` with the compatible provider.
3. See https://refine.dev/core/docs/data/packages/graphql/

---

## Related documentation (non-Refine)

| Library | Docs |
|---------|------|
| Ant Design 5 | https://ant.design/components/overview/ |
| React Router 7 | https://reactrouter.com/ |
| Vite 6 | https://vite.dev/ |

---

## Maintenance note

This index was generated from Refine **v5** docs (May 2026). When upgrading `@refinedev/*` packages, re-check migration guides and interface references. Official docs remain the source of truth for new APIs.
