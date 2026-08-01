# Workout Health Details and Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Workout health charts expandable into detailed chart-and-table views and add persistent RU/EN localization for Workout.

**Architecture:** A Workout-local context owns translations, persistence, and
formatting. A shared health-details modal receives already-filtered chart rows,
while the existing steps and weight components remain responsible for their
chart semantics.

**Tech Stack:** React 19, TypeScript, Ant Design 5, Recharts, Vitest, Testing Library.

## Global Constraints

- Change only `utils/my-utils`; do not change API contracts.
- Do not add dependencies.
- Localize Workout only; do not alter admin pages or the global sidebar.
- Keep `All` uncapped and derive chart dates from their data values.
- Do not commit, push, or deploy without a separate user request.

---

### Task 1: Workout locale contract

**Files:**
- Create: `src/features/workout/workoutLocale.tsx`
- Test: `src/features/workout/workoutLocale.test.tsx`

**Interfaces:**
- Produces: `WorkoutLocaleProvider`, `useWorkoutLocale`, `WorkoutLocale`,
  localized `t`, date, and number formatting.

- [ ] Write tests proving browser-language fallback, persisted choice, and
  English/Russian rendering.
- [ ] Run `npm test -- src/features/workout/workoutLocale.test.tsx` and verify
  failure because the locale module is missing.
- [ ] Implement the provider and typed dictionary with the storage key
  `my-utils.workout-locale`.
- [ ] Re-run the focused test and verify it passes.

### Task 2: Shared detailed health modal

**Files:**
- Create: `src/features/workout/WorkoutHealthDetailsModal.tsx`
- Test: `src/features/workout/WorkoutHealthDetailsModal.test.tsx`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: Workout locale formatters and already-filtered rows.
- Produces: a responsive modal containing caller-provided chart content and a
  newest-first `date / value` table.

- [ ] Write a failing interaction test that opens the modal, finds localized
  headers, and verifies newest-first rows.
- [ ] Run the focused test and confirm the expected missing-component failure.
- [ ] Implement the modal, semantic table, keyboard-accessible trigger contract,
  and responsive styles.
- [ ] Re-run the focused test and verify it passes.

### Task 3: Expand steps and weight charts

**Files:**
- Modify: `src/features/workout/WorkoutStepsChart.tsx`
- Modify: `src/features/workout/WorkoutBodyWeightChart.tsx`
- Modify: `src/index.css`
- Test: `src/features/workout/WorkoutHealthDetailsModal.test.tsx`

**Interfaces:**
- Consumes: `WorkoutHealthDetailsModal` and the locale hook.
- Produces: compact charts that open a 420px detailed chart without another API
  request and preserve the active period.

- [ ] Extend the interaction test for both chart types and verify it fails.
- [ ] Extract reusable chart render sections inside each health component and
  add expand actions/chart click handling.
- [ ] Render the active period control, large chart, and correct table values in
  each modal.
- [ ] Re-run the focused tests and verify they pass.

### Task 4: Localize the Workout surface

**Files:**
- Modify: `src/features/workout/WorkoutPage.tsx`
- Modify: `src/features/workout/WorkoutWeeklySummary.tsx`
- Modify: `src/features/workout/WorkoutMuscleGroupSummary.tsx`
- Modify: `src/features/workout/WorkoutProgressPanel.tsx`
- Modify: `src/features/workout/WorkoutExerciseBar.tsx`
- Modify: `src/features/workout/WorkoutEntryForm.tsx`
- Modify: `src/features/workout/WorkoutExerciseForm.tsx`
- Modify: `src/features/workout/WorkoutSessionList.tsx`
- Modify: `src/features/workout/WorkoutGridTable.tsx`
- Modify: `src/features/workout/WorkoutGridCell.tsx`
- Modify: `src/features/workout/WorkoutGridCellEditor.tsx`
- Modify: `src/features/workout/WorkoutGridCellEditorModal.tsx`
- Modify: `src/features/workout/workoutMuscleGroups.ts`

**Interfaces:**
- Consumes: `useWorkoutLocale`.
- Produces: a Workout-only RU/EN switch and localized visible copy.

- [ ] Add failing component assertions for the page title and language switch.
- [ ] Wrap Workout content in the locale provider and nested Ant Design locale.
- [ ] Replace visible Workout literals with dictionary entries and localized
  date/number formatting.
- [ ] Re-run focused tests after each component group.

### Task 5: Complete verification

**Files:**
- Review all changed files and docs.

- [ ] Run `npm exec eslint -- src`.
- [ ] Run `npm test`.
- [ ] Run `env UPDATE_NOTIFIER_IS_DISABLED=true npm run build`.
- [ ] Run `git diff --check` and inspect `git diff --stat`.
- [ ] Delegate desktop and narrow browser smoke checks for both health modals and
  both languages; fix only failed or ambiguous findings and repeat those checks.
