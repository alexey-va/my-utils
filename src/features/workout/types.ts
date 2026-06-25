import type { MuscleGroup } from "./workoutMuscleGroups";
import type { ProgressPoint } from "../../api/types";

export type WorkoutEntryDraft = {
  key: string;
  exerciseId: string;
  exerciseName: string;
  performedOn: string;
  weightKg: number;
  setCount: number;
  repsPerSet: number;
  maxReps: number;
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
  };
}
