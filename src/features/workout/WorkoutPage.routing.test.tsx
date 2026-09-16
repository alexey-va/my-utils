import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import WorkoutPage from "./WorkoutPage";

vi.mock("../../telemetry/workoutTelemetry", () => ({
  sendWorkoutPageViewOnce: vi.fn(),
}));

vi.mock("./useWorkoutGrid", () => ({
  useWorkoutGrid: () => ({
    exercises: [],
    grid: { dates: [], rows: [] },
    loading: false,
    saving: false,
    error: null,
    dataVersion: 0,
    selectedExerciseId: undefined,
    selectExercise: vi.fn(),
    addExercise: vi.fn(),
    updateExercise: vi.fn(),
    deleteExercise: vi.fn(),
    saveEntry: vi.fn(),
    deleteEntry: vi.fn(),
    moveEntry: vi.fn(),
    reload: vi.fn(),
  }),
}));

vi.mock("./useStepsHistory", () => ({
  useStepsHistory: () => ({
    history: null,
    loading: false,
    error: null,
    retry: vi.fn(),
  }),
}));

vi.mock("./useBodyWeightHistory", () => ({
  useBodyWeightHistory: () => ({
    history: null,
    loading: false,
    error: null,
    retry: vi.fn(),
  }),
}));

vi.mock("./useCompareProgress", () => ({
  useCompareProgress: () => ({
    series: [],
    primary: null,
    loading: false,
  }),
}));

vi.mock("./WorkoutExerciseBar", () => ({
  default: () => <div data-testid="workout-exercise-bar" />,
}));
vi.mock("./WorkoutGridTable", () => ({
  default: () => <div data-testid="workout-grid-table" />,
}));
vi.mock("./WorkoutSessionList", () => ({
  default: () => <div data-testid="workout-session-list" />,
}));
vi.mock("./WorkoutProgressPanel", () => ({
  default: () => <div data-testid="workout-progress-panel" />,
}));
vi.mock("./WorkoutStepsChart", () => ({
  default: () => <div data-testid="workout-steps-chart" />,
}));
vi.mock("./WorkoutBodyWeightChart", () => ({
  default: () => <div data-testid="workout-weight-chart" />,
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("WorkoutPage public routes", () => {
  it.each([
    ["/", "Progress"],
    ["/workout/overview", "Progress"],
    ["/workout/journal", "Exercise and sessions"],
  ])("opens %s in the expected Workout view", (path, regionName) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <WorkoutPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("region", { name: regionName })).toBeInTheDocument();
  });
});
