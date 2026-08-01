import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { WorkoutHealthDetailsModal } from "./WorkoutHealthDetailsModal";
import {
  WORKOUT_LOCALE_STORAGE_KEY,
  WorkoutLocaleProvider,
} from "./workoutLocale";

afterEach(cleanup);

describe("WorkoutHealthDetailsModal", () => {
  it("shows localized headers and daily rows newest first", () => {
    localStorage.setItem(WORKOUT_LOCALE_STORAGE_KEY, "ru");

    render(
      <WorkoutLocaleProvider>
        <WorkoutHealthDetailsModal
          open
          title="Шаги по дням"
          valueLabel="Шаги"
          rows={[
            { date: "2026-07-30", value: "8 100" },
            { date: "2026-08-01", value: "10 250" },
            { date: "2026-07-31", value: "9 400" },
          ]}
          controls={<div>Период</div>}
          chart={<div>Большой график</div>}
          onClose={() => undefined}
        />
      </WorkoutLocaleProvider>,
    );

    expect(screen.getByRole("dialog", { name: "Шаги по дням" })).toBeInTheDocument();
    expect(screen.getByText("Большой график")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Дата" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Шаги" })).toBeInTheDocument();

    const rows = screen.getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("10 250")).toBeInTheDocument();
    expect(within(rows[1]).getByText("9 400")).toBeInTheDocument();
    expect(within(rows[2]).getByText("8 100")).toBeInTheDocument();
  });
});
