import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import WorkoutLanguageSwitch from "./WorkoutLanguageSwitch";
import {
  WORKOUT_LOCALE_STORAGE_KEY,
  WorkoutLocaleProvider,
  useWorkoutLocale,
} from "./workoutLocale";

afterEach(cleanup);

function CurrentTitle() {
  const { t } = useWorkoutLocale();
  return <h1>{t("page.title")}</h1>;
}

describe("WorkoutLanguageSwitch", () => {
  it("switches only the Workout locale from the visible RU/EN control", () => {
    localStorage.setItem(WORKOUT_LOCALE_STORAGE_KEY, "ru");

    render(
      <WorkoutLocaleProvider>
        <WorkoutLanguageSwitch />
        <CurrentTitle />
      </WorkoutLocaleProvider>,
    );

    expect(screen.getByRole("heading", { name: "Тренировки" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "EN" }));

    expect(screen.getByRole("heading", { name: "Workout log" })).toBeInTheDocument();
    expect(localStorage.getItem(WORKOUT_LOCALE_STORAGE_KEY)).toBe("en");
  });
});
