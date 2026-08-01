# Workout Health Details and Localization Design

## Scope

Change only the public Workout feature in `my-utils`. Keep the existing health
API paths and payloads unchanged. Do not add a localization dependency.

## Health chart details

The steps and body-weight cards keep their compact dashboard charts. Clicking
the chart area or its expand action opens a wide modal for the selected card.
The modal contains:

- the same period selector as the compact card;
- a larger chart using the currently filtered data;
- a vertically scrollable two-column table below the chart;
- newest dates first in the table;
- localized date and value labels.

The steps table shows `date / steps`. The weight table shows `date / kg`.
Desktop uses a wide modal; narrow screens use the viewport width and a shorter
chart so the table remains reachable. Opening the modal must not change the
selected period or fetch data again.

## Workout localization

Add an RU/EN control to the Workout page header. Translate the Workout page,
health cards and details, workout summaries, progress controls, training grid,
session list, and Workout forms. Admin pages and the global sidebar remain
unchanged.

The first visit uses the browser language (`ru*` selects Russian, otherwise
English). Store an explicit choice under `my-utils.workout-locale` and reuse it
on later visits. Use the locale for dates and number grouping as well as text.
Nest the relevant Ant Design locale provider inside Workout so other SPA pages
are unaffected.

## Structure

- `workoutLocale.tsx` owns the typed dictionary, locale persistence, formatting
  helpers, and Workout-only Ant Design/dayjs locale selection.
- `WorkoutHealthDetailsModal.tsx` owns the shared modal and vertical table.
- Each health chart owns its compact and expanded chart rendering and passes
  filtered rows into the shared modal.
- Existing Workout components consume the locale hook for visible copy.

## Verification

Use TDD for locale persistence and the details modal. Then run the focused
tests, complete Vitest suite, ESLint, production build, and `git diff --check`.
Run desktop and narrow browser smoke checks for both health modals and both
languages. No push or deployment is part of this change.
