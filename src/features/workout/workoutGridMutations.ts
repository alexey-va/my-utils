import type { UpsertWorkoutEntryRequest, WorkoutCell, WorkoutGrid } from "../../api/types";

/** Newest date first (left column after exercise name). */
export function sortGridDatesNewestFirst(dates: string[]): string[] {
  return [...dates].sort((a, b) => b.localeCompare(a));
}

export function payloadToWorkoutCell(payload: UpsertWorkoutEntryRequest): WorkoutCell {
  const setReps = payload.setReps ?? null;
  let display: string;
  if (setReps?.length) {
    display = `${payload.weightKg}  ${setReps.join("/")}`;
  } else if (payload.maxReps !== payload.repsPerSet) {
    display = `${payload.weightKg}  ${payload.setCount}×${payload.repsPerSet}/${payload.maxReps}`;
  } else {
    display = `${payload.weightKg}  ${payload.setCount}×${payload.repsPerSet}`;
  }
  return {
    weightKg: payload.weightKg,
    setCount: payload.setCount,
    repsPerSet: payload.repsPerSet,
    maxReps: payload.maxReps,
    setReps,
    display,
  };
}

export function applyUpsertToGrid(grid: WorkoutGrid, payload: UpsertWorkoutEntryRequest): WorkoutGrid {
  const cell = payloadToWorkoutCell(payload);
  const dates = sortGridDatesNewestFirst([...grid.dates, payload.performedOn]);
  const rows = grid.rows.map((row) => {
    if (row.exerciseId !== payload.exerciseId) {
      return row;
    }
    return {
      ...row,
      cells: { ...row.cells, [payload.performedOn]: cell },
    };
  });
  return { dates, rows };
}

export function applyMoveToGrid(
  grid: WorkoutGrid,
  from: { exerciseId: string; fromDate: string },
  toExerciseId: string,
  toDate: string,
  cell: WorkoutCell,
): WorkoutGrid {
  const dates = sortGridDatesNewestFirst([...grid.dates, toDate]);
  const rows = grid.rows.map((row) => {
    const cells = { ...row.cells };
    if (row.exerciseId === from.exerciseId) {
      delete cells[from.fromDate];
    }
    if (row.exerciseId === toExerciseId) {
      cells[toDate] = cell;
    }
    return { ...row, cells };
  });
  return { dates, rows };
}

export function applyDeleteFromGrid(
  grid: WorkoutGrid,
  exerciseId: string,
  performedOn: string,
): WorkoutGrid {
  const rows = grid.rows.map((row) => {
    if (row.exerciseId !== exerciseId) {
      return row;
    }
    const cells = { ...row.cells };
    delete cells[performedOn];
    return { ...row, cells };
  });
  const datesStillUsed = new Set<string>();
  for (const row of rows) {
    for (const date of Object.keys(row.cells)) {
      datesStillUsed.add(date);
    }
  }
  const dates = sortGridDatesNewestFirst(
    grid.dates.filter((date) => datesStillUsed.has(date)),
  );
  return { dates, rows };
}
