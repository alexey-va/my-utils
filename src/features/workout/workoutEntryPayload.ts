import type { UpsertWorkoutEntryRequest, WorkoutCell } from "../../api/types";
import { parseRepsPattern, repsPatternFromCell } from "./workoutSetReps";

export function upsertRequestFromValues(
  exerciseId: string,
  performedOn: string,
  weightKg: number,
  repsPattern: string,
  defaultSetCount = 3,
): UpsertWorkoutEntryRequest {
  const weight = Math.round(weightKg);
  const reps = parseRepsPattern(repsPattern);
  if (!reps?.length) {
    throw new Error("Enter reps per set, e.g. 10/10/9/9");
  }
  if (reps.length === 1) {
    const repsPerSet = reps[0];
    return {
      exerciseId,
      performedOn,
      weightKg: weight,
      setCount: defaultSetCount,
      repsPerSet,
      maxReps: repsPerSet,
    };
  }
  return {
    exerciseId,
    performedOn,
    weightKg: weight,
    setCount: reps.length,
    repsPerSet: Math.min(...reps),
    maxReps: Math.max(...reps),
    setReps: reps,
  };
}

export function upsertRequestFromCell(
  exerciseId: string,
  performedOn: string,
  cell: WorkoutCell,
  overrides?: { weightKg?: number; repsPattern?: string },
): UpsertWorkoutEntryRequest {
  return upsertRequestFromValues(
    exerciseId,
    performedOn,
    overrides?.weightKg ?? cell.weightKg,
    overrides?.repsPattern ?? repsPatternFromCell(cell),
    cell.setCount,
  );
}
