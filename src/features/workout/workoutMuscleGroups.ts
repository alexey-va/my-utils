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

export function normalizeMuscleGroup(value: string | undefined | null): MuscleGroup {
  const v = (value ?? "other").trim().toLowerCase();
  return (MUSCLE_GROUPS as readonly string[]).includes(v) ? (v as MuscleGroup) : "other";
}
