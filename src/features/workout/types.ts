import type { MuscleGroup } from "./workoutMuscleGroups";
import type { WorkoutCell } from "../../api/types";

export type WorkoutCellTarget = {
  exerciseId: string;
  date: string;
  cell?: WorkoutCell;
};

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

export type FooterEditor =
  | { kind: "entry"; draft: WorkoutEntryDraft }
  | { kind: "exercise"; draft: ExerciseDraft };

export function entryDraftFromCell(
  target: WorkoutCellTarget,
  exerciseName: string,
  lastSession?: WorkoutCell,
): WorkoutEntryDraft {
  const cell = target.cell;
  const template = cell ?? lastSession;
  return {
    key: `${target.exerciseId}-${target.date}`,
    exerciseId: target.exerciseId,
    exerciseName,
    performedOn: target.date,
    weightKg: template?.weightKg ?? 20,
    setCount: template?.setCount ?? 3,
    repsPerSet: template?.repsPerSet ?? 10,
    maxReps: template?.maxReps ?? 10,
  };
}
