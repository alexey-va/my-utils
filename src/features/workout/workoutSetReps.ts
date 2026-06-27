import type { WorkoutCell } from "../../api/types";

/** Parse "10/10/9/9" or "10,10,9,9" into reps per set. */
export function parseRepsPattern(raw: string): number[] | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const parts = trimmed.includes("/") ? trimmed.split("/") : trimmed.split(",");
  const reps = parts.map((part) => {
    const value = Number.parseInt(part.trim(), 10);
    if (!Number.isFinite(value) || value < 1) {
      throw new Error(`Invalid reps: "${part.trim()}"`);
    }
    return value;
  });
  if (reps.length === 0) {
    throw new Error("Reps pattern is empty");
  }
  return reps;
}

export function formatRepsPattern(reps: number[] | null | undefined): string {
  if (!reps?.length) {
    return "";
  }
  return reps.join("/");
}

export function cellVolume(weightKg: number, cell: WorkoutCell): number {
  if (cell.setReps?.length) {
    return weightKg * cell.setReps.reduce((sum, reps) => sum + reps, 0);
  }
  return weightKg * cell.setCount * cell.repsPerSet;
}

export function repsPatternFromCell(cell: WorkoutCell): string {
  if (cell.setReps?.length) {
    return formatRepsPattern(cell.setReps);
  }
  if (cell.maxReps !== cell.repsPerSet) {
    return formatRepsPattern([
      ...Array.from({ length: cell.setCount }, () => cell.repsPerSet),
      cell.maxReps,
    ]);
  }
  return String(cell.repsPerSet);
}
