import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import WorkoutBodyWeightChart from "./WorkoutBodyWeightChart";
import WorkoutStepsChart from "./WorkoutStepsChart";
import {
  WORKOUT_LOCALE_STORAGE_KEY,
  WorkoutLocaleProvider,
} from "./workoutLocale";

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

afterEach(cleanup);

describe("Workout health chart details", () => {
  it("opens a detailed steps chart and daily table", () => {
    localStorage.setItem(WORKOUT_LOCALE_STORAGE_KEY, "en");

    render(
      <WorkoutLocaleProvider>
        <WorkoutStepsChart
          days={[
            { date: "2026-07-31", steps: 8123 },
            { date: "2026-08-01", steps: 10456 },
          ]}
          todaySteps={10456}
          loading={false}
          period="p7"
          onPeriodChange={() => undefined}
        />
      </WorkoutLocaleProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open detailed view" }));

    const dialog = screen.getByRole("dialog", { name: "Steps by day" });
    expect(within(dialog).getByRole("columnheader", { name: "Steps" })).toBeInTheDocument();
    expect(within(dialog).getByText("10,456")).toBeInTheDocument();
    expect(within(dialog).getByText("8,123")).toBeInTheDocument();
  });

  it("opens a detailed weight chart and localized daily table", () => {
    localStorage.setItem(WORKOUT_LOCALE_STORAGE_KEY, "ru");

    render(
      <WorkoutLocaleProvider>
        <WorkoutBodyWeightChart
          days={[
            { date: "2026-07-31", weightKg: 83.1 },
            { date: "2026-08-01", weightKg: 82.8 },
          ]}
          latestWeightKg={82.8}
          latestDate="2026-08-01"
          loading={false}
          period="p7"
          onPeriodChange={() => undefined}
        />
      </WorkoutLocaleProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Открыть подробный вид" }));

    const dialog = screen.getByRole("dialog", { name: "Вес по дням" });
    expect(within(dialog).getByRole("columnheader", { name: "Вес" })).toBeInTheDocument();
    expect(within(dialog).getByText("82,8 кг")).toBeInTheDocument();
    expect(within(dialog).getByText("83,1 кг")).toBeInTheDocument();
  });
});
