import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  WORKOUT_LOCALE_STORAGE_KEY,
  WorkoutLocaleProvider,
  useWorkoutLocale,
} from "./workoutLocale";

function LocaleProbe() {
  const { locale, setLocale, t } = useWorkoutLocale();

  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span>{t("page.title")}</span>
      <button type="button" onClick={() => setLocale("en")}>
        EN
      </button>
    </div>
  );
}

const originalLanguage = window.navigator.language;

function setBrowserLanguage(language: string) {
  Object.defineProperty(window.navigator, "language", {
    configurable: true,
    value: language,
  });
}

afterEach(() => {
  cleanup();
  setBrowserLanguage(originalLanguage);
});

describe("WorkoutLocaleProvider", () => {
  it("uses Russian for a Russian browser and persists an explicit English choice", () => {
    setBrowserLanguage("ru-RU");

    render(
      <WorkoutLocaleProvider>
        <LocaleProbe />
      </WorkoutLocaleProvider>,
    );

    expect(screen.getByTestId("locale")).toHaveTextContent("ru");
    expect(screen.getByText("Тренировки")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "EN" }));

    expect(screen.getByTestId("locale")).toHaveTextContent("en");
    expect(screen.getByText("Workout log")).toBeInTheDocument();
    expect(localStorage.getItem(WORKOUT_LOCALE_STORAGE_KEY)).toBe("en");
  });

  it("prefers the stored Workout locale over the browser language", () => {
    setBrowserLanguage("en-US");
    localStorage.setItem(WORKOUT_LOCALE_STORAGE_KEY, "ru");

    render(
      <WorkoutLocaleProvider>
        <LocaleProbe />
      </WorkoutLocaleProvider>,
    );

    expect(screen.getByTestId("locale")).toHaveTextContent("ru");
    expect(screen.getByText("Тренировки")).toBeInTheDocument();
  });
});
