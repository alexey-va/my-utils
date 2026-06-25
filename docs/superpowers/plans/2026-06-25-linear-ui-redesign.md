# Linear UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate my-utils SPA from Grafana-gray theme to full Linear in-product design (DESIGN-APP.md) in one PR.

**Architecture:** Hybrid tokens — `design/linearTokens.ts` as hex source of truth, `linear-tokens.css` for layout CSS, `appTheme.ts` for Ant Design. Bulk replace hardcoded colors in `index.css` and feature TSX with CSS variables or token imports. No business logic changes.

**Tech Stack:** Vite 6, React 19, Refine v5, Ant Design 5, Tailwind 4 (minimal), Recharts (workout)

**Spec:** `docs/superpowers/specs/2026-06-25-linear-ui-redesign-design.md`

---

## File map

| File | Responsibility |
|------|----------------|
| `index.html` | Google Fonts CDN links |
| `design/linearTokens.ts` | **Create** — exported hex constants |
| `design/linear-tokens.css` | CSS vars (sync with TS) |
| `theme/appTheme.ts` | Ant ConfigProvider from tokens |
| `theme/linearTheme.ts` | **Create** — optional helper mapping tokens → ThemeConfig |
| `src/index.css` | Global layout; vars only, no hex |
| `src/features/workout/workoutChartColors.ts` | Semantic chart palette |
| `src/features/workout/WorkoutProgressPanel.tsx` | Remove inline hex if any |
| `src/features/workout/WorkoutWeeklySummary.tsx` | Remove inline hex if any |
| `src/features/observability/GrafanaPage.tsx` | Linear iframe chrome |
| `src/features/temporal/TemporalPage.tsx` | Linear iframe chrome |
| `layout/SiderFooterButton.tsx` | Remove `escape` yellow variant or remap to secondary |

---

## Chunk 1: Foundation

### Task 1: Token source of truth

**Files:**
- Create: `design/linearTokens.ts`
- Modify: `design/linear-tokens.css`

- [ ] **Step 1:** Create `design/linearTokens.ts` exporting all DESIGN-APP colors as named constants (`canvas`, `surface1`, `primary`, `semanticRed`, etc.)

- [ ] **Step 2:** Ensure `linear-tokens.css` matches TS values; add any missing vars (`--linear-ink-secondary`, semantic colors)

- [ ] **Step 3:** Verify import in `src/index.css` remains `@import "./design/linear-tokens.css"`

### Task 2: Google Fonts

**Files:**
- Modify: `index.html`

- [ ] **Step 1:** Add preconnect + stylesheet:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
```

- [ ] **Step 2:** Set `body { font-family: Inter, system-ui, sans-serif; }` in `index.css`

### Task 3: Ant Design theme

**Files:**
- Create: `src/theme/linearTheme.ts` (build ThemeConfig from `linearTokens`)
- Modify: `src/theme/appTheme.ts` — re-export or replace with linear mapping

- [ ] **Step 1:** Map tokens per spec: bg `#08090a`, container `#0f1011`, text `#f7f8f8`, border `#23252a`, primary `#5e6ad2`, hover `#828fff`

- [ ] **Step 2:** Component overrides: Layout, Menu, Card (no shadow), Button, Input, Table, Tag, Segmented

- [ ] **Step 3:** Run `npm run build` — expect PASS

---

## Chunk 2: Global CSS & layout chrome

### Task 4: index.css token sweep

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1:** Replace every hardcoded hex with `var(--linear-*)` or existing aliases (`--page-bg`, `--text`, etc.)

- [ ] **Step 2:** Remove gradients on `.app-panel`, `.generator-card` — flat `background: var(--card-bg)`

- [ ] **Step 3:** Remove or reduce `box-shadow` on panels to none or minimal hairline-only

- [ ] **Step 4:** Sidebar classes: `#151a26` → `var(--linear-surface-1)`, hovers → surface-2, selected → surface-3

- [ ] **Step 5:** Grep `src/index.css` for `#[0-9a-fA-F]` — expect zero matches

### Task 5: Sidebar footer & escape variant

**Files:**
- Modify: `src/layout/SiderFooterButton.tsx`
- Modify: `src/index.css` (`.app-sider__footer-btn--escape` if kept)

- [ ] **Step 1:** Remove yellow `escape` styling; use same as default footer button (secondary)

- [ ] **Step 2:** `AppSider.tsx` — `variant="escape"` can become default or removed

### Task 6: Iframe chrome

**Files:**
- Modify: `src/features/observability/GrafanaPage.tsx`
- Modify: `src/features/temporal/TemporalPage.tsx`
- Modify: `src/index.css` (`.grafana-page__*`, `.temporal-page__*`)

- [ ] **Step 1:** Chrome bar bg `var(--linear-surface-1)`, border hairline

- [ ] **Step 2:** Exit button: secondary style, lavender focus ring only

- [ ] **Step 3:** Remove yellow `#f0b429` rules

---

## Chunk 3: Features

### Task 7: Workout visuals

**Files:**
- Modify: `src/features/workout/workoutChartColors.ts`
- Modify: `src/index.css` (workout section ~lines 673–1756)
- Modify: `src/features/workout/WorkoutProgressPanel.tsx`
- Modify: `src/features/workout/WorkoutWeeklySummary.tsx`

- [ ] **Step 1:** Update chart palette to semantic Linear colors

- [ ] **Step 2:** Replace workout CSS hex with vars; heat cells use `rgb(from var(--linear-primary) r g b / 8%)` or equivalent alpha

- [ ] **Step 3:** Compare tag, sparkline, matrix focus → lavender not `#6b9fff`

- [ ] **Step 4:** Grep `src/features/workout` for hex — zero outside chart palette file

### Task 8: Generators, JSON, Properties, Auth, Admin

**Files:**
- Modify: generator components if inline styles exist
- Modify: `src/features/json/JsonPage.tsx`, `src/features/properties/*`, `src/features/auth/LoginPage.tsx`, `src/features/admin/AdminPage.tsx`

- [ ] **Step 1:** Ensure primary buttons use Ant primary (lavender) — no custom gray overrides

- [ ] **Step 2:** Properties tags — use Ant Tag with semantic colors where applicable

- [ ] **Step 3:** Login link color via Ant token or CSS `var(--linear-primary-hover)`

### Task 9: Shared components

**Files:**
- Modify: `src/shared/components/AppPanel.tsx` (class only if needed)
- Modify: `src/index.css` `.app-panel`, `.app-page__*`

- [ ] **Step 1:** Confirm flat card styling; 12px radius, hairline border

---

## Chunk 4: Verification & docs

### Task 10: Build & visual QA

- [ ] **Step 1:** Run `cd utils/my-utils && npm run build`

Expected: exit 0, no TypeScript errors

- [ ] **Step 2:** Manual checklist:
  - `/` generators, `/json`, `/workout`, `/properties`
  - `/observability`, `/workflows` — escape button Linear style
  - `/admin` login flow
  - Sidebar expand/collapse

- [ ] **Step 3:** Grep entire `src/` for `#[0-9a-fA-F]{3,8}` — only `workoutChartColors.ts` and `linearTokens.ts` (if re-exported)

### Task 11: AGENTS.md note

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1:** Add line: theme implemented via `linearTokens.ts` + `appTheme.ts`; do not add raw hex in components

---

## Execution notes

- Working directory: `utils/my-utils/`
- Do not change `config/features.tsx` routes or API code
- Prefer CSS variables over inline `style={{ color: ... }}`
- If Ant component looks wrong after token change, fix in `appTheme.ts` components section first before local overrides

---

**Plan complete.** Ready to execute in current session or dedicated branch.
