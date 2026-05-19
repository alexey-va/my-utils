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
};

export function exerciseDraftNew(): ExerciseDraft {
  return { key: "exercise-new", name: "" };
}

export function exerciseDraftFromExercise(exerciseId: string, name: string): ExerciseDraft {
  return { key: `exercise-${exerciseId}`, exerciseId, name };
}

export type FooterEditor =
  | { kind: "entry"; draft: WorkoutEntryDraft }
  | { kind: "exercise"; draft: ExerciseDraft };

export function entryDraftFromCell(
  target: WorkoutCellTarget,
  exerciseName: string,
): WorkoutEntryDraft {
  const cell = target.cell;
  return {
    key: `${target.exerciseId}-${target.date}`,
    exerciseId: target.exerciseId,
    exerciseName,
    performedOn: target.date,
    weightKg: cell?.weightKg ?? 20,
    setCount: cell?.setCount ?? 3,
    repsPerSet: cell?.repsPerSet ?? 10,
    maxReps: cell?.maxReps ?? 10,
  };
}
