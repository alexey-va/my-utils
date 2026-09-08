import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import type { CompareChartRow, CompareSeries } from "./workoutAnalytics";
import WorkoutCompareChartTooltip from "./WorkoutCompareChartTooltip";
import {
  WORKOUT_LOCALE_STORAGE_KEY,
  WorkoutLocaleProvider,
} from "./workoutLocale";

afterEach(cleanup);

it("uses the hovered ISO date when two years have the same displayed day and month", () => {
  localStorage.setItem(WORKOUT_LOCALE_STORAGE_KEY, "ru");
  const chartData: CompareChartRow[] = [
    { date: "2025-09-10", label: "10 сент.", s_bench: 70 },
    { date: "2026-09-10", label: "10 сент.", s_bench: 90 },
  ];
  const series: CompareSeries[] = [{
    exerciseId: "bench",
    name: "Жим лёжа",
    color: "#345678",
    points: [
      {
        date: "2025-09-10",
        weightKg: 70,
        setCount: 3,
        repsPerSet: 8,
        maxReps: 8,
        volume: 1680,
      },
      {
        date: "2026-09-10",
        weightKg: 90,
        setCount: 3,
        repsPerSet: 8,
        maxReps: 8,
        volume: 2160,
      },
    ],
  }];

  render(
    <WorkoutLocaleProvider>
      <WorkoutCompareChartTooltip
        active
        label="2026-09-10"
        chartData={chartData}
        series={series}
        metric="weight"
        period="all"
      />
    </WorkoutLocaleProvider>,
  );

  expect(screen.getByText("10 сент. 2026 г.")).toBeInTheDocument();
  expect(screen.getByText("90 кг")).toBeInTheDocument();
  expect(screen.queryByText("70 кг")).not.toBeInTheDocument();
});
