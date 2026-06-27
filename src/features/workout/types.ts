import type { MuscleGroup } from "./workoutMuscleGroups";
import type { ProgressPoint, WorkoutCell } from "../../api/types";
import { formatRepsPattern, repsPatternFromCell } from "./workoutSetReps";

export type WorkoutEntryDraft = {
  key: string;
  exerciseId: string;
  exerciseName: string;
  performedOn: string;
  weightKg: number;
  setCount: number;
  repsPerSet: number;
  maxReps: number;
  setReps?: number[] | null;
  repsPattern?: string;
};

export type ExerciseDraft = {
  key: string;
  exerciseId?: string;
  name: string;
  muscleGroup: MuscleGroup;
};

export function exerciseDraftNew(): ExerciseDraft {
  return { key: "exercise-new", name: "", muscleGroup: "other" };
}

export function exerciseDraftFromExercise(
  exerciseId: string,
  name: string,
  muscleGroup: MuscleGroup,
): ExerciseDraft {
  return { key: `exercise-${exerciseId}`, exerciseId, name, muscleGroup };
}

export function entryDraftFromPoint(
  exerciseId: string,
  exerciseName: string,
  point: ProgressPoint,
): WorkoutEntryDraft {
  return {
    key: `${exerciseId}-${point.date}`,
    exerciseId,
    exerciseName,
    performedOn: point.date,
    weightKg: point.weightKg,
    setCount: point.setCount,
    repsPerSet: point.repsPerSet,
    maxReps: point.maxReps,
    setReps: point.setReps ?? null,
    repsPattern: point.setReps?.length
      ? formatRepsPattern(point.setReps)
      : point.maxReps !== point.repsPerSet
        ? formatRepsPattern([
            ...Array.from({ length: point.setCount }, () => point.repsPerSet),
            point.maxReps,
          ])
        : String(point.repsPerSet),
  };
}

export function entryDraftFromCell(
  exerciseId: string,
  exerciseName: string,
  date: string,
  cell: WorkoutCell,
): WorkoutEntryDraft {
  return {
    key: `${exerciseId}-${date}`,
    exerciseId,
    exerciseName,
    performedOn: date,
    weightKg: cell.weightKg,
    setCount: cell.setCount,
    repsPerSet: cell.repsPerSet,
    maxReps: cell.maxReps,
    setReps: cell.setReps ?? null,
    repsPattern: repsPatternFromCell(cell),
  };
}
