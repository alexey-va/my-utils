export type LoginResponse = {
  token: string;
  user: { email: string };
};

export type UserProfile = {
  email: string;
};

export type Exercise = {
  id: string;
  name: string;
  muscleGroup: string;
};

export type WorkoutCell = {
  weightKg: number;
  setCount: number;
  repsPerSet: number;
  maxReps: number;
  display: string;
};

export type WorkoutGridRow = {
  exerciseId: string;
  exerciseName: string;
  cells: Record<string, WorkoutCell>;
};

export type WorkoutGrid = {
  dates: string[];
  rows: WorkoutGridRow[];
};

export type UpsertWorkoutEntryRequest = {
  exerciseId: string;
  performedOn: string;
  weightKg: number;
  setCount: number;
  repsPerSet: number;
  maxReps: number;
};

export type ProgressPoint = {
  date: string;
  weightKg: number;
  setCount: number;
  repsPerSet: number;
  maxReps: number;
  volume: number;
};

export type ExerciseStats = {
  sessions: number;
  bestWeightKg: number | null;
  latestWeightKg: number | null;
  bestMaxReps: number | null;
  bestVolume: number | null;
};

export type ExerciseProgress = {
  exercise: Exercise;
  points: ProgressPoint[];
  stats: ExerciseStats;
};

export type ProgressMetric = "weight" | "maxReps" | "volume";
