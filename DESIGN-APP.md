# My Utils workspace design

The application defaults to Graphite. The top bar offers Graphite, Blue, Violet,
and Light palettes with a saved selection. This document owns the in-product design; `DESIGN.md` is a separate
marketing reference.

## Design references

- [Linear Insights](https://linear.app/insights): hierarchy between main analysis and supporting context.
- [Raycast themes](https://manual.raycast.com/themes): whole-interface palettes with visual previews.

## Sources

- `src/design/linearTokens.ts`: palettes and chart series colors. The historical
  Linear names remain for compatibility with existing components.
- `src/design/linear-tokens.css`: matching CSS custom properties for all four palettes.
- `src/theme/linearTheme.ts`: Ant Design mapping; no component-local theme palette.
- `src/theme/AppThemeProvider.tsx`: theme ownership and `my-utils.theme` persistence.
- `src/design/workspace.css`: shared shell and current Workout composition.
- `src/index.css`: existing feature-specific tables, forms and embedded tools.

## Composition

Use the selected palette with legible neutral text, 1px borders and
independent surfaces. Avoid nested cards, decorative gradients, giant shadows
and arbitrary component colors. Chart labels, grids and tooltips must use CSS
tokens so they follow the active theme.

The desktop sidebar starts as a 56px icon rail and can expand to 236px. Below 1000px navigation
moves into a dismissible drawer and returns the screen width to the content.
Use the catalog for route metadata and preserve server-side authorization.
The shared top bar owns navigation context and an appearance dialog with four live theme previews.

Page titles use 28–40px type. Body controls use the existing Inter/system stack.
Desktop page padding is 24–36px; phone padding is 18px. Panels use consistent
16px radii, 18–24px padding and 16–24px gaps. Keep `minmax(0, 1fr)` grid tracks
and `min-width: 0` for content that can shrink.

## Workout

- Place the entry action in the page header. Weekly metrics form one aligned strip
  separated by hairlines, without repeated card containers. No motivational slogans.
- Overview gives exercise progress the main column, with an embedded exercise picker.
  Put the weekly calendar and muscle-group volume in a narrower context column.
  Paired health cards follow below. Secondary progress metrics remain in a disclosure.
- Keep the chart readable at first glance: restrained series colors, thin grids,
  tabular numbers, quiet supporting labels and no redundant plot decoration.
- Journal contains the exercise picker, table/list switch, entry action and an
  overflow menu for edit/export actions. Existing grid and session workflows stay available.
- Health cards reserve the same header/stat/control/chart rows. Loading placeholders
  reserve their final area. Disable chart redraw animation and preserve current
  data during background updates.
- Use one `GET /api/workouts/snapshot` for exercise metadata and grid. Ignore stale
  responses; show a visible error/retry state rather than presenting a failed read
  as an empty diary. Health failures have an independent retry action.
- Wait for server confirmation before refreshing progress or closing the grid
  editor. A rejected save retains the draft and allows retry.
- Complete health history remains available through `All`; no `days` query cap.

## Acceptance

Run lint, Vitest, production build and diff check. Check the actual built UI at
390, 900 and 1440px, plus the desktop navigation breakpoint. Verify no document
horizontal overflow, equal paired-card geometry, reachable primary actions,
keyboard-accessible dialogs, persistence of all four themes and failure/retry behavior.
Use synthetic data for mutations; production verification is read-only.
