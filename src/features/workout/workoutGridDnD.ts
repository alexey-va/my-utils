export const WORKOUT_CELL_DRAG_MIME = "application/x-workout-grid-cell";

export type WorkoutGridDragPayload = {
  exerciseId: string;
  fromDate: string;
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
