export type LoginResponse = {
  token: string;
  user: AuthUser;
};

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  role: "USER" | "ADMIN";
  mustChangePassword: boolean;
};

export type UserProfile = AuthUser;

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
  setReps?: number[] | null;
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
  setReps?: number[] | null;
};

export type MoveWorkoutEntryRequest = {
  fromExerciseId: string;
  fromDate: string;
  toExerciseId: string;
  toDate: string;
};

export type ProgressPoint = {
  date: string;
  weightKg: number;
  setCount: number;
  repsPerSet: number;
  maxReps: number;
  setReps?: number[] | null;
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

export type HealthStepDay = {
  date: string;
  steps: number;
};

export type HealthStepsHistory = {
  days: HealthStepDay[];
  todaySteps: number | null;
};

export type HealthBodyWeightDay = {
  date: string;
  weightKg: number;
};

export type HealthBodyWeightHistory = {
  days: HealthBodyWeightDay[];
  latestWeightKg: number | null;
  latestDate: string | null;
};
