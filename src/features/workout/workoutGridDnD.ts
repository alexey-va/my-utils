import type { WorkoutCell } from "../../api/types";

export const WORKOUT_CELL_DRAG_MIME = "application/x-workout-grid-cell";

export type WorkoutGridDragPayload = {
  exerciseId: string;
  fromDate: string;
};

export type WorkoutGridActiveDrag = {
  payload: WorkoutGridDragPayload;
  display: string;
  previewClass: string;
  grabOffsetX: number;
  grabOffsetY: number;
  cellWidth: number;
  cellHeight: number;
};

export type WorkoutGridCellEditorSession = {
  mode: "add" | "edit";
  exerciseId: string;
  date: string;
  exerciseName: string;
  dateLabel: string;
  weightKg: number;
  repsPattern: string;
  cell?: WorkoutCell;
};

export function encodeDragPayload(payload: WorkoutGridDragPayload): string {
  return JSON.stringify(payload);
}

export function decodeDragPayload(raw: string): WorkoutGridDragPayload | null {
  try {
    const parsed = JSON.parse(raw) as WorkoutGridDragPayload;
    if (typeof parsed.exerciseId === "string" && typeof parsed.fromDate === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function isValidDropTarget(
  drag: WorkoutGridDragPayload,
  exerciseId: string,
  date: string,
  hasCell: boolean,
): boolean {
  if (hasCell) {
    return false;
  }
  if (drag.exerciseId === exerciseId && drag.fromDate === date) {
    return false;
  }
  return true;
}

export function findDropCellElement(
  exerciseId: string,
  date: string,
): HTMLElement | null {
  return document.querySelector(
    `[data-workout-grid-drop][data-exercise-id="${exerciseId}"][data-date="${date}"]`,
  );
}

export function readCellClientRect(exerciseId: string, date: string) {
  const el = findDropCellElement(exerciseId, date);
  if (!el) {
    return null;
  }
  const rect = el.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}
