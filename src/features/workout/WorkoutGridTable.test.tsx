import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { Exercise, WorkoutGrid } from "../../api/types";
import WorkoutGridTable from "./WorkoutGridTable";
import { WorkoutLocaleProvider } from "./workoutLocale";

const exercises: Exercise[] = [{ id: "bench", name: "Bench press", muscleGroup: "chest" }];
const grid: WorkoutGrid = {
  dates: ["2026-09-07", "2026-09-08"],
  rows: [{
    exerciseId: "bench",
    exerciseName: "Bench press",
    cells: {
      "2026-09-07": {
        weightKg: 20,
        setCount: 1,
        repsPerSet: 10,
        maxReps: 10,
        display: "20 × 10",
      },
    },
  }],
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Reflect.deleteProperty(document, "elementFromPoint");
});

it("keeps the grid busy and does not open another editor while a write is pending", () => {
  const { container } = render(
    <WorkoutLocaleProvider>
      <WorkoutGridTable
        exercises={exercises}
        grid={grid}
        loading
        onSelectExercise={vi.fn()}
        onMoveCell={vi.fn()}
        onUpdateCell={vi.fn()}
      />
    </WorkoutLocaleProvider>,
  );

  expect(container.querySelector(".workout-grid")).toHaveAttribute("aria-busy", "true");

  fireEvent.click(screen.getByRole("button", { name: "20 × 10" }));

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("does not commit a drag that became busy before release", async () => {
  const onMoveCell = vi.fn();
  const { container, rerender } = render(
    <WorkoutLocaleProvider>
      <WorkoutGridTable
        exercises={exercises}
        grid={grid}
        loading={false}
        onSelectExercise={vi.fn()}
        onMoveCell={onMoveCell}
        onUpdateCell={vi.fn()}
      />
    </WorkoutLocaleProvider>,
  );
  const target = container.querySelector<HTMLElement>(
    '[data-workout-grid-drop][data-exercise-id="bench"][data-date="2026-09-08"]',
  );
  expect(target).not.toBeNull();
  Object.defineProperty(document, "elementFromPoint", {
    configurable: true,
    value: () => target,
  });

  fireEvent.mouseDown(screen.getByRole("button", { name: "20 × 10" }), {
    clientX: 10,
    clientY: 10,
  });
  fireEvent.mouseMove(document, { clientX: 20, clientY: 20 });
  await waitFor(() => expect(document.querySelector("[data-workout-drag-overlay]")).toBeInTheDocument());

  rerender(
    <WorkoutLocaleProvider>
      <WorkoutGridTable
        exercises={exercises}
        grid={grid}
        loading
        onSelectExercise={vi.fn()}
        onMoveCell={onMoveCell}
        onUpdateCell={vi.fn()}
      />
    </WorkoutLocaleProvider>,
  );
  await waitFor(() => expect(document.querySelector("[data-workout-drag-overlay]")).toBeInTheDocument());
  fireEvent.mouseUp(document, { clientX: 20, clientY: 20 });

  expect(onMoveCell).not.toHaveBeenCalled();
});
