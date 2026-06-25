# Linear UI Redesign — Design Spec

**Date:** 2026-06-25  
**Project:** `utils/my-utils` (Vite + React + Refine + Ant Design SPA)  
**Status:** Approved

## Goal

Rewrite the my-utils interface to match the Linear in-product design system (`DESIGN-APP.md`), in a single PR: tokens, typography, layout chrome, and all feature tabs.

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Depth | Full Linear pass (tokens + components + typography + density) |
| Iframe escape (Grafana/Temporal) | Linear chrome: thin bar, secondary button, lavender on hover/focus only |
| Fonts | Google Fonts CDN: Inter 400/500/600 + JetBrains Mono 400/500 |
| Delivery | One branch / one PR — no phased rollout |

## Reference documents

- `DESIGN-APP.md` — primary for SPA (canvas `#08090a`, surfaces, semantic colors)
- `DESIGN.md` — marketing reference (not used for app chrome)
- `design/linear-tokens.css` — CSS custom properties
- `.cursor/rules/frontend-design-linear.mdc` — agent rules

## Visual foundation

### Colors

- **Canvas:** `#08090a` — page background
- **Surface ladder:** `#0f1011` (sider, cards, inputs) → `#141516` (hover) → `#18191a` (selected)
- **Hairlines:** `#23252a` default, `#34343a` strong, `#3e3e44` tertiary
- **Text:** `#f7f8f8` primary, `#d0d6e0` secondary, `#8a8f98` muted, `#62666d` quaternary
- **Accent (scarce):** `#5e6ad2` primary, `#828fff` hover/link, `#5e69d1` focus ring
- **Semantic (tags/charts only):** red `#eb5757`, orange `#fc7840`, yellow `#f0bf00`, green `#27a644`, blue `#4ea7fc`, teal `#00b8cc`, indigo `#5e6ad2`

### Typography

- **UI:** Inter via Google Fonts CDN
- **Mono:** JetBrains Mono for JSON, generators output, workout matrix, properties JSON
- **Page title:** 28px / 600 / −0.02em letter-spacing
- **Page subtitle:** 13px / 400 / muted color
- **Panel title:** 15px / 500

### Shapes & elevation

- Buttons/inputs: 8px radius, padding 8px 14px
- Cards/panels: 12px radius
- **No** card gradients, **no** heavy `box-shadow` stacks — depth via surface + 1px borders

## Architecture approach

**Hybrid token strategy:**

1. `design/linearTokens.ts` — single TS source of hex values (Ant theme, Recharts, rare inline needs)
2. `design/linear-tokens.css` — CSS variables synced from same values
3. `theme/appTheme.ts` — Ant Design `ConfigProvider` mapped from `linearTokens.ts`
4. `src/index.css` — layout/sidebar/workout use `var(--linear-*)` only; no raw hex outside token files

## Layout & chrome

### Sidebar (keep structure)

- Icon rail 56px / expanded 240px — unchanged behavior
- Colors from surface ladder; selected = surface-3, not colored rail
- Footer: login/logout + expand — secondary styling

### Page shell

- `PageLayout` structure unchanged; styles from tokens

### Iframe tabs (Observability, Temporal)

- Top chrome bar: 44px, bg `#0f1011`, hairline bottom
- Escape button: secondary (surface-1 + hairline border), **not yellow**
- Hover: surface-2; focus: 2px lavender outline
- Iframe content (Grafana/Temporal UI) not modified

## Shared components

### AppPanel

- Flat card: surface-1, hairline border, 12px radius, no gradient/shadow

### AppPanel / GeneratorCard

- Same flat treatment as AppPanel

## Feature modules

| Tab | Scope |
|-----|--------|
| Generators | Flat cards; mono output; lavender primary actions |
| JSON | Dense toolbar; errors semantic-red; mono inputs |
| Workout | Replace all hardcoded hex; chart palette from semantic set; matrix heat lavender alpha; compare accent lavender |
| Properties | Table density; label-style headers; semantic tags |
| Admin | Panel + lavender primary |
| Login | Same tokens; links `#828fff` |
| Observability / Temporal | Chrome only (see above) |

## Workout chart palette

Replace `workoutChartColors.ts`:

```ts
["#5e6ad2", "#4ea7fc", "#27a644", "#fc7840", "#00b8cc", "#f0bf00"]
```

Sparklines and compare highlights: `#5e6ad2` / `#828fff` (not `#6b9fff`).

## CSS hygiene rule

After migration: no raw hex in `src/` except `design/linearTokens.ts` and chart palette constant.

## Out of scope

- API / backend changes
- Route or feature logic changes
- Grafana or Temporal UI inside iframes
- Light mode

## Verification

- `npm run build` passes
- Visual smoke: all 7 tabs + login + sidebar states + iframe escape
- Workout: matrix, chart, form, 520px breakpoint
- Primary button contrast: white on `#5e6ad2` (WCAG AA)

## Source

Brainstorming session 2026-06-25; community Linear spec from [awesome-design-md/linear.app](https://github.com/VoltAgent/awesome-design-md/tree/main/design-md/linear.app).
