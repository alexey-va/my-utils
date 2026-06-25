export const MUSCLE_GROUPS = [
  "chest",
  "back",
  "legs",
  "shoulders",
  "arms",
  "core",
  "other",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: "Chest",
  back: "Back",
  legs: "Legs",
  shoulders: "Shoulders",
  arms: "Arms",
  core: "Core",
  other: "Other",
};

/** Accent colors for grid rows and muscle-group hints (readable on dark UI). */
export const MUSCLE_GROUP_COLORS: Record<MuscleGroup, string> = {
  chest: "#60a5fa",
  back: "#a78bfa",
  legs: "#34d399",
  shoulders: "#f472b6",
  arms: "#fb923c",
  core: "#facc15",
  other: "#94a3b8",
};

export function normalizeMuscleGroup(value: string | undefined | null): MuscleGroup {
  const v = (value ?? "other").trim().toLowerCase();
  return (MUSCLE_GROUPS as readonly string[]).includes(v) ? (v as MuscleGroup) : "other";
}
