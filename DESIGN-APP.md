---
version: alpha
name: Linear-app-ui
description: "In-product UI layer for Linear-style apps — darker canvas (#08090a), surface ladder, lavender accent, issue-label semantics, dense lists, keyboard-first chrome. Complements DESIGN.md (marketing canvas #010102). Use this file for dashboards, sidebars, tables, forms, and admin tools."

colors:
  # App canvas (product UI — slightly lighter than marketing #010102)
  canvas: "#08090a"
  canvas-marketing: "#010102"
  surface-0: "#08090a"
  surface-1: "#0f1011"
  surface-2: "#141516"
  surface-3: "#18191a"
  surface-4: "#191a1b"
  surface-tint: "#141516"
  surface-secondary: "#1c1c1f"
  surface-tertiary: "#232326"
  surface-quaternary: "#28282c"
  surface-quinary: "#282828"
  panel: "#0f1011"

  # Text
  ink: "#f7f8f8"
  ink-secondary: "#d0d6e0"
  ink-tertiary: "#8a8f98"
  ink-quaternary: "#62666d"
  editor-text: "#e4e5e9"

  # Borders / lines (hairline system)
  hairline: "#23252a"
  hairline-strong: "#34343a"
  hairline-tertiary: "#3e3e44"
  line-primary: "#37393a"
  line-secondary: "#202122"
  line-tertiary: "#18191a"
  line-tint: "#141516"

  # Brand / accent
  primary: "#5e6ad2"
  primary-hover: "#828fff"
  primary-focus: "#5e69d1"
  accent: "#7170ff"
  accent-tint: "#18182f"
  link: "#828fff"
  on-primary: "#ffffff"
  brand-secure: "#7a7fad"

  # Issue / status semantics (in-app only — never on marketing hero)
  semantic-red: "#eb5757"
  semantic-orange: "#fc7840"
  semantic-yellow: "#f0bf00"
  semantic-green: "#27a644"
  semantic-blue: "#4ea7fc"
  semantic-indigo: "#5e6ad2"
  semantic-teal: "#00b8cc"
  semantic-plan: "#68cc58"
  semantic-build: "#d4b144"
  semantic-overlay: "#000000"

  # Inverse (rare inverse CTAs)
  inverse-canvas: "#ffffff"
  inverse-surface: "#f5f6f6"
  inverse-ink: "#000000"
  button-invert-bg: "#e5e5e6"

typography:
  font-display: "Inter, SF Pro Display, -apple-system, system-ui, Segoe UI, sans-serif"
  font-text: "Inter, SF Pro Text, -apple-system, system-ui, Segoe UI, sans-serif"
  font-mono: "JetBrains Mono, ui-monospace, SF Mono, Menlo, monospace"

  display-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.6px
  title:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: -0.4px
  body:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: -0.05px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0
  label:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: 0.04em
  mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  button:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: 0

rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  pill: 9999px

spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px
  section: 48px

components:
  app-sidebar:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink-secondary}"
    width: 240px
    width-rail: 56px
    height: 56px
  app-sidebar-item-selected:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.ink}"
  app-sidebar-item-hover:
    backgroundColor: "{colors.surface-2}"
  list-row:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    height: 36px
    padding: 0 12px
  list-row-hover:
    backgroundColor: "{colors.surface-2}"
  table-header:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink-tertiary}"
    typography: "{typography.label}"
  table-cell:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
  input:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    rounded: "{rounded.md}"
    padding: 8px 12px
  input-focus:
    borderColor: "{colors.primary-focus}"
    outline: "2px {colors.primary-focus} 50%"
  tag-priority-urgent:
    backgroundColor: "{colors.semantic-red}"
  tag-priority-high:
    backgroundColor: "{colors.semantic-orange}"
  tag-priority-medium:
    backgroundColor: "{colors.semantic-yellow}"
  tag-priority-low:
    backgroundColor: "{colors.semantic-blue}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    padding: 8px 14px
  button-secondary:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    rounded: "{rounded.md}"
    padding: 8px 14px
  command-palette:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    borderColor: "{colors.hairline-strong}"
---

## Relationship to DESIGN.md

| File | Scope | Canvas | Use when |
|------|--------|--------|----------|
| `DESIGN.md` | Marketing / landing | `#010102` | Hero pages, marketing sections, product screenshots on dark panels |
| `DESIGN-APP.md` | **Product UI** (this file) | `#08090a` | SPA, dashboard, sidebar, tables, forms, admin — **my-utils** |

For **my-utils** (Refine + Ant Design SPA), **this file is primary**. `DESIGN.md` is reference for marketing-adjacent polish.

## Visual principles (app)

1. **Density** — 36–40px list rows, compact controls, information over decoration.
2. **Surface ladder** — hierarchy via `surface-0` → `surface-4`, not shadows.
3. **Hairline borders** — 1px `#23252a` / `#34343a`; depth without box-shadow stacks.
4. **One chromatic accent** — lavender `#5e6ad2` for primary actions, focus, links only.
5. **Semantic colors** — red/orange/yellow/green/blue for tags, status, charts — never as page backgrounds.
6. **Keyboard-first** — visible focus rings, command palette patterns, shortcut hints where useful.
7. **Mono for data** — IDs, JSON, metrics: `JetBrains Mono` 13px.

## Color roles (app)

### Surfaces

- `{colors.canvas}` / `{colors.surface-0}` — page background `#08090a`
- `{colors.surface-1}` — sidebar, cards, inputs `#0f1011`
- `{colors.surface-2}` — hover rows, elevated panels `#141516`
- `{colors.surface-3}` — selected nav item, dropdown `#18191a`
- `{colors.surface-4}` — deepest lift `#191a1b`

### Text

- `{colors.ink}` — primary `#f7f8f8`
- `{colors.ink-secondary}` — secondary `#d0d6e0`
- `{colors.ink-tertiary}` — muted labels `#8a8f98`
- `{colors.ink-quaternary}` — disabled, footnotes `#62666d`

### Accent (scarce)

- `{colors.primary}` `#5e6ad2` — primary button, brand
- `{colors.primary-hover}` `#828fff` — hover CTA, links
- `{colors.primary-focus}` `#5e69d1` — focus ring
- `{colors.accent-tint}` `#18182f` — tinted selection backgrounds (subtle)

### Semantic (tags / status only)

| Token | Hex | Use |
|-------|-----|-----|
| `{colors.semantic-red}` | `#eb5757` | Urgent, error, blocked |
| `{colors.semantic-orange}` | `#fc7840` | High priority |
| `{colors.semantic-yellow}` | `#f0bf00` | Medium, warning |
| `{colors.semantic-green}` | `#27a644` | Success, done |
| `{colors.semantic-blue}` | `#4ea7fc` | Low, info |
| `{colors.semantic-teal}` | `#00b8cc` | Secondary info |
| `{colors.semantic-plan}` | `#68cc58` | Plan tier accent |
| `{colors.semantic-build}` | `#d4b144` | Build/changelog accent |

## Typography (app)

- **Display**: Inter 28px/600 for page titles — negative tracking -0.6px.
- **Title**: Inter 22px/500 for panel headers.
- **Body**: Inter 15px/400 default UI text.
- **Body-sm**: Inter 13px for tables, dense UI.
- **Caption**: Inter 12px for meta, timestamps.
- **Label**: Inter 11px/500 uppercase +0.04em for column headers, section eyebrows.
- **Mono**: JetBrains Mono 13px for code, JSON, numeric tables (`tabular-nums`).

Never use display sizes (56px+) inside app chrome — those belong to marketing (`DESIGN.md`).

## Layout

- **Grid base**: 4px; common gaps 8, 12, 16, 24.
- **Sidebar**: 240px expanded / 56px icon rail; header strip 56px height.
- **Content**: max-width fluid; padding 24px desktop, 16px mobile.
- **List row height**: 36px default, 40px comfortable touch.
- **Table header**: sticky optional; 32–36px header row.

## Components (app patterns)

### Sidebar navigation

- Background `{colors.surface-1}`, border-right 1px `{colors.hairline}`.
- Item: transparent default, `{colors.surface-2}` hover, `{colors.surface-3}` selected.
- Icon column fixed 56px when collapsed; labels fade in column 2.
- No colored selection bar — surface lift only (Linear style).

### Primary / secondary buttons

- Primary: `{colors.primary}` bg, white text, `{rounded.md}`, padding 8px 14px.
- Secondary: `{colors.surface-1}` bg, `{colors.hairline}` border, `{colors.ink}` text.
- Never pill-shaped primary CTAs in app chrome.

### Inputs & selects

- Background `{colors.surface-1}`, border 1px `{colors.hairline}`, `{rounded.md}`.
- Focus: 2px outline `{colors.primary-focus}` at ~50% opacity, 2px offset.
- Placeholder: `{colors.ink-tertiary}`.

### Cards / panels

- Background `{colors.surface-1}`, border 1px `{colors.hairline}`, `{rounded.lg}` 12px.
- **No** heavy shadows; optional subtle top-edge highlight on dark panels.
- Interior padding 16–24px.

### Tables

- Header: `{colors.surface-1}`, label typography, `{colors.ink-tertiary}`.
- Row hover: `{colors.surface-2}`; selected row: `{colors.accent-tint}` or `{colors.surface-3}`.
- Cell padding 8px 12px; monospace for numeric columns.

### Tags / badges

- Use semantic palette; small `{rounded.xs}` or `{rounded.pill}` for status.
- Background at ~15–20% opacity of semantic color OR solid for priority dots.

### Command palette (optional)

- Floating panel `{colors.surface-2}`, `{rounded.lg}`, border `{colors.hairline-strong}`.
- Input at top, results list with `{list-row}` pattern, keyboard selection highlight.

## Elevation

Linear app UI uses **surface + border**, not shadow stacks:

| Level | Treatment |
|-------|-----------|
| 0 | Flat on `{colors.canvas}` |
| 1 | `{colors.surface-1}` + 1px `{colors.hairline}` |
| 2 | `{colors.surface-2}` + `{colors.hairline-strong}` |
| 3 | Dropdowns, popovers on `{colors.surface-3}` |
| Focus | 2px `{colors.primary-focus}` outline |

Avoid `box-shadow: 0 8px 32px` cards — that is Grafana/generic dark, not Linear.

## Ant Design mapping (my-utils)

Map `ConfigProvider` `theme.token` to these values:

```ts
// src/theme/appTheme.ts — target mapping (reference)
colorBgBase: "#08090a"
colorBgLayout: "#08090a"
colorBgContainer: "#0f1011"
colorTextBase: "#f7f8f8"
colorTextSecondary: "#8a8f98"
colorBorder: "#23252a"
colorPrimary: "#5e6ad2"
colorPrimaryHover: "#828fff"
borderRadius: 8
controlHeight: 36
fontFamily: "Inter, system-ui, sans-serif"
```

Component overrides:

- `Layout.siderBg`: `#0f1011`
- `Menu.itemSelectedBg`: `#18191a`
- `Menu.itemHoverBg`: `#141516`
- `Card`: no heavy shadow; border `#23252a`

## CSS variables (index.css)

Prefer semantic names aligned with tokens:

```css
:root {
  --linear-canvas: #08090a;
  --linear-surface-1: #0f1011;
  --linear-surface-2: #141516;
  --linear-hairline: #23252a;
  --linear-ink: #f7f8f8;
  --linear-ink-muted: #8a8f98;
  --linear-primary: #5e6ad2;
  --linear-primary-hover: #828fff;
}
```

## Do's and Don'ts (app)

### Do

- Use `#08090a` canvas for product UI (not marketing `#010102` unless full-bleed marketing page).
- Keep lavender scarce: primary button, focus, links, chart accent line.
- Use semantic colors only for tags, status, chart series — not chrome.
- Compact density; `tabular-nums` for metrics.
- `h-dvh` not `h-screen`; respect `safe-area-inset` on mobile.
- Focus rings always visible (a11y).

### Don't

- Grafana-gray palette (`#121621`, `#181d29`) — current legacy theme, migrate away.
- Blue chart accent `#6b9fff` as primary brand color — use lavender family.
- Yellow escape buttons as default chrome — keep for iframe exit only.
- Gradients on cards, glassmorphism, neumorphism.
- Pill primary buttons in app.
- Light mode unless explicitly requested.

## Responsive

| Breakpoint | Changes |
|------------|---------|
| ≥1280px | Sidebar expanded optional; 3-column grids |
| 768–1279px | Sidebar rail; 2-column grids |
| <768px | Hamburger or icon rail; single column; min 44px touch targets |

## Agent Prompt Guide

Copy-paste when generating UI:

```
Build [component/page] for my-utils SPA using DESIGN-APP.md (Linear in-product UI).

Canvas #08090a, surfaces #0f1011/#141516/#18191a, hairline borders #23252a.
Text #f7f8f8 / muted #8a8f98. Primary accent #5e6ad2 only for CTAs, focus, links.
Inter 15px body, JetBrains Mono for code. Buttons 8px radius, 8px 14px padding.
No heavy shadows, no gradients, no pill CTAs. Dense 36px list rows.
Ant Design + Tailwind; map tokens from DESIGN-APP.md YAML.
Semantic tag colors (red/orange/yellow/green/blue) for status only.
```

## Sources

- App tokens extracted from Linear CSS variables (see [designmd.directory](https://designmd.directory/p/linear-design-md))
- Marketing spec: `DESIGN.md` from [awesome-design-md/linear.app](https://github.com/VoltAgent/awesome-design-md/tree/main/design-md/linear.app)
- Not official Linear documentation — community reference for AI agents

## Known gaps

- Exact Linear custom fonts are proprietary — use Inter + JetBrains Mono.
- Animation specs (spring curves) not fully documented — default 150–200ms ease-out.
- Light mode not defined (Linear product is dark-first).
