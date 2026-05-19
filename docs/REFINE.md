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
| `@refinedev/antd` | ^6.0.2 | `ThemedLayout`, `ErrorComponent`, Ant Design glue |
| `@refinedev/react-router` | ^2.0.0 | `routerProvider` for React Router v7 |
| `@refinedev/cli` | ^2.16.48 | `refine dev` / `refine build` / `refine start` |
| `@refinedev/graphql` | ^6.4.8 | Installed; **not wired** (stub data provider) |
| `@refinedev/devtools` | ^2.0.1 | Dev overlay |
| `@refinedev/kbar` | ^2.0.0 | Command palette (optional) |

**Also in stack (not Refine):** React 19, Vite 6, Ant Design 5, `react-router-dom` 7, Tailwind 4.

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
              └── Routes
                    └── /* → <ThemedLayout Sider={AppSider} Header={null}>
                              ├── AppRoutes (nested routes)
                              └── AuthNotice
```

| Concern | Location in repo |
|---------|------------------|
| Refine shell | `src/App.tsx` |
| Routes | `src/components/AppRoutes.tsx` |
| Auth (optional mock) | `src/providers/authProvider.ts`, `src/auth/session.ts` |
| Access control | `src/providers/accessControlProvider.ts` (`meta.requiresAuth`) |
| Route guard | `src/components/RequireAuth.tsx` |
| Data (stub) | `src/providers/dataProvider.ts` |
| Sidebar menu | `src/config/resources.tsx` |
| Custom sider | `src/components/AppSider.tsx` |
| Ant Design theme | `src/theme/appTheme.ts` |

**No `<Authenticated>` wrapper** — `authProvider.check` always allows the app shell. Guests use public tools; `/admin` is gated by `RequireAuth` + `requiresAuth` on the dashboard resource.

**Custom pages** (Generators, JSON) are plain React components; they do not use `useList` / `useForm` unless you add CRUD later.

---

## CLI

| Command | Description |
|---------|-------------|
| `npm run dev` | `refine dev` — Vite dev server |
| `npm run build` | `tsc && refine build` — production build |
| `npm run start` | `refine start` — serve production build |
| `npm run refine` | Pass-through to Refine CLI |
| `npm create refine-app@latest` | Scaffold new app |

**Docs:** https://refine.dev/core/docs/packages/cli/

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
  <ThemedLayout>...</ThemedLayout>
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

## Ant Design integration (`@refinedev/antd`)

**Docs:** https://refine.dev/core/docs/ui-integrations/ant-design/introduction/

Import reset CSS once (see `src/index.tsx`):

```ts
import "antd/dist/reset.css";
// or: import "@refinedev/antd/dist/reset.css";
```

### Components used in my-utils

| Component | Docs |
|-----------|------|
| `ThemedLayout` | https://refine.dev/core/docs/ui-integrations/ant-design/components/themed-layout/ |
| `ErrorComponent` | https://refine.dev/core/docs/ui-integrations/ant-design/components/error-component/ |
| `AuthPage` | https://refine.dev/core/docs/ui-integrations/ant-design/components/auth-page/ (optional; we use custom Login) |

### CRUD views (when you add real resources)

| View | Docs |
|------|------|
| List | https://refine.dev/core/docs/ui-integrations/ant-design/components/basic-views/list/ |
| Create | https://refine.dev/core/docs/ui-integrations/ant-design/components/basic-views/create/ |
| Edit | https://refine.dev/core/docs/ui-integrations/ant-design/components/basic-views/edit/ |
| Show | https://refine.dev/core/docs/ui-integrations/ant-design/components/basic-views/show/ |

### Ant Design hooks

`useTable`, `useForm`, `useModalForm`, `useDrawerForm`, `useSelect`, etc.  
**Index:** https://refine.dev/core/docs/ui-integrations/ant-design/hooks/use-table/

### Theming

Refine Ant Design respects Ant Design `ConfigProvider`. This project sets theme in `src/theme/appTheme.ts`.  
**Docs:** https://refine.dev/core/docs/ui-integrations/ant-design/theming/

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
3. Add routes under `ThemedLayout`.
4. Use `<List>`, `<Create>`, `<Edit>`, `<Show>` from `@refinedev/antd` or custom pages with `useTable` / `useForm`.

### Add a menu item (custom page only)

1. Add to `src/config/resources.tsx`: `{ name: "foo", list: "/foo", meta: { label: "Foo", icon: <Icon /> } }`.
2. Add `<Route path="foo" element={<Foo />} />` in `src/components/AppRoutes.tsx`.

### Add a login-gated page

1. Resource: `meta: { requiresAuth: true }` in `config/resources.tsx`.
2. Route: wrap with `<RequireAuth>` in `AppRoutes.tsx`.
3. Menu item is hidden for guests via `accessControlProvider`; direct URL redirects to `/` with `AuthNotice` toast.

### Replace mock auth

1. Edit `src/auth/session.ts` and `src/providers/authProvider.ts` — real API, secure token storage.
2. Keep `check` returning `{ authenticated: true }` if the shell should stay public; otherwise use `<Authenticated>` or redirect in `check`.
3. Attach tokens to the data provider HTTP client in `onError` or an axios interceptor.

### Wire GraphQL (already in package.json)

1. Replace stub in `dataProvider.ts` with `dataProvider` from `@refinedev/graphql`.
2. See https://refine.dev/core/docs/data/packages/graphql/

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
