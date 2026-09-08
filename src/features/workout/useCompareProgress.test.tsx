import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { apiClient } from "../../api";
import type { ExerciseProgress } from "../../api/types";
import { WorkoutLocaleProvider } from "./workoutLocale";
import { useCompareProgress } from "./useCompareProgress";
import {
  getWorkoutProgressCache,
  invalidateWorkoutProgress,
} from "./workoutProgressCache";

const wrapper = ({ children }: { children: ReactNode }) => (
  <WorkoutLocaleProvider>{children}</WorkoutLocaleProvider>
);
const progress = (id: string, weight = 20): ExerciseProgress => ({
  exercise: { id, name: id, muscleGroup: "back" },
  points: [
    {
      date: "2026-09-07",
      weightKg: weight,
      setCount: 1,
      repsPerSet: 10,
      maxReps: 10,
      volume: weight * 10,
    },
  ],
  stats: {
    sessions: 1,
    bestWeightKg: weight,
    latestWeightKg: weight,
    bestMaxReps: 10,
    bestVolume: weight * 10,
  },
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  invalidateWorkoutProgress();
});
it("keeps the current chart visible while confirmed writes refresh its data", async () => {
  getWorkoutProgressCache().set("one", progress("one"));
  let resolve!: (value: ExerciseProgress) => void;
  vi.spyOn(apiClient, "get").mockReturnValue(
    new Promise<ExerciseProgress>((yes) => {
      resolve = yes;
    }),
  );
  const { result, rerender } = renderHook(
    ({ version }) => useCompareProgress(["one"], "one", version),
    { wrapper, initialProps: { version: 0 } },
  );
  await waitFor(() =>
    expect(result.current.primary?.stats.latestWeightKg).toBe(20),
  );
  act(() => {
    invalidateWorkoutProgress();
    rerender({ version: 1 });
  });
  expect(result.current.primary?.stats.latestWeightKg).toBe(20);
  expect(result.current.series).toHaveLength(1);
  await act(async () => {
    resolve(progress("one", 25));
  });
  expect(result.current.primary?.stats.latestWeightKg).toBe(25);
});
it("does not let a previous exercise response replace or cache the current selection", async () => {
  let resolve!: (value: ExerciseProgress) => void;
  vi.spyOn(apiClient, "get")
    .mockReturnValueOnce(
      new Promise<ExerciseProgress>((yes) => {
        resolve = yes;
      }),
    )
    .mockResolvedValueOnce(progress("two"));
  const { result, rerender } = renderHook(
    ({ id }) => useCompareProgress([id], id),
    { wrapper, initialProps: { id: "one" } },
  );
  rerender({ id: "two" });
  await waitFor(() => expect(result.current.primary?.exercise.id).toBe("two"));
  await act(async () => {
    resolve(progress("one"));
  });
  expect(result.current.primary?.exercise.id).toBe("two");
  expect(getWorkoutProgressCache().has("one")).toBe(false);
});

it("rejects a pre-save response that arrives before the refreshed grid", async () => {
  let resolve!: (value: ExerciseProgress) => void;
  vi.spyOn(apiClient, "get")
    .mockReturnValueOnce(
      new Promise<ExerciseProgress>((yes) => {
        resolve = yes;
      }),
    )
    .mockResolvedValueOnce(progress("one", 25));
  const { result, rerender } = renderHook(
    ({ version }) => useCompareProgress(["one"], "one", version),
    { wrapper, initialProps: { version: 0 } },
  );
  act(() => invalidateWorkoutProgress());
  await act(async () => {
    resolve(progress("one", 20));
  });
  expect(getWorkoutProgressCache().has("one")).toBe(false);
  rerender({ version: 1 });
  await waitFor(() =>
    expect(result.current.primary?.stats.latestWeightKg).toBe(25),
  );
});
