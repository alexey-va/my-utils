import type { UpsertWorkoutEntryRequest, WorkoutCell } from "../../api/types";
import { parseRepsPattern, repsPatternFromCell } from "./workoutSetReps";

export function upsertRequestFromCell(
  exerciseId: string,
  performedOn: string,
  cell: WorkoutCell,
  overrides?: { weightKg?: number; repsPattern?: string },
): UpsertWorkoutEntryRequest {
  const weightKg = Math.round(overrides?.weightKg ?? cell.weightKg);
  const reps = parseRepsPattern(overrides?.repsPattern ?? repsPatternFromCell(cell));
  if (!reps?.length) {
    throw new Error("Enter reps per set, e.g. 10/10/9/9");
  }
  if (reps.length === 1) {
    const repsPerSet = reps[0];
    return {
      exerciseId,
      performedOn,
      weightKg,
      setCount: cell.setCount,
      repsPerSet,
      maxReps: repsPerSet,
    };
  }
  return {
    exerciseId,
    performedOn,
    weightKg,
    setCount: reps.length,
    repsPerSet: Math.min(...reps),
    maxReps: Math.max(...reps),
    setReps: reps,
  };
}
