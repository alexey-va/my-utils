import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { message } from "antd";
import { apiClient } from "../../api";
import { ApiError } from "../../api/errors";
import { apiEndpoints } from "../../api/endpoints";
import type { WorkoutSnapshot } from "../../api/types";
import { WorkoutLocaleProvider } from "./workoutLocale";
import { useWorkoutGrid } from "./useWorkoutGrid";

const wrapper = ({ children }: { children: ReactNode }) => (
  <WorkoutLocaleProvider>{children}</WorkoutLocaleProvider>
);
const snapshot = (name: string): WorkoutSnapshot => ({
  exercises: [{ id: "one", name, muscleGroup: "back" }],
  grid: {
    dates: [],
    rows: [{ exerciseId: "one", exerciseName: name, cells: {} }],
  },
});
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("Workout snapshot lifecycle", () => {
  it("loads one snapshot and ignores an earlier response that finishes last", async () => {
    const first = deferred<WorkoutSnapshot>();
    vi.spyOn(apiClient, "get")
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(snapshot("Current"));
    const { result } = renderHook(useWorkoutGrid, { wrapper });
    await act(async () => {
      await result.current.reload();
    });
    await act(async () => {
      first.resolve(snapshot("Old"));
    });
    expect(result.current.exercises[0].name).toBe("Current");
    expect(apiClient.get).toHaveBeenCalledWith(apiEndpoints.workouts.snapshot);
    expect(result.current.loading).toBe(false);
  });
  it("keeps committed data and refresh version stable until the write succeeds", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue(snapshot("Exercise"));
    const pending = deferred<void>();
    vi.spyOn(apiClient, "post").mockReturnValue(pending.promise);
    const { result } = renderHook(useWorkoutGrid, { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    let saving!: Promise<void>;
    act(() => {
      saving = result.current.saveEntry({
        exerciseId: "one",
        performedOn: "2026-09-07",
        weightKg: 20,
        setCount: 3,
        repsPerSet: 10,
        maxReps: 10,
      });
    });
    expect(result.current.saving).toBe(true);
    expect(result.current.dataVersion).toBe(0);
    expect(apiClient.get).toHaveBeenCalledTimes(1);
    await act(async () => {
      pending.resolve();
      await saving;
    });
    expect(result.current.dataVersion).toBe(1);
    expect(apiClient.get).toHaveBeenCalledTimes(2);
    expect(result.current.saving).toBe(false);
  });
  it("reports a failed read and recovers through retry", async () => {
    vi.spyOn(apiClient, "get")
      .mockRejectedValueOnce(new ApiError(503, "Unavailable"))
      .mockResolvedValueOnce(snapshot("Recovered"));
    const { result } = renderHook(useWorkoutGrid, { wrapper });
    await waitFor(() => expect(result.current.error).toBe("Unavailable"));
    await act(async () => {
      await result.current.reload();
    });
    expect(result.current.error).toBeNull();
    expect(result.current.exercises[0].name).toBe("Recovered");
  });
  it("keeps the journal after a failed save and unlocks the form", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue(snapshot("Unchanged"));
    vi.spyOn(apiClient, "post").mockRejectedValue(
      new ApiError(503, "Unavailable"),
    );
    vi.spyOn(message, "error").mockImplementation(() => (() => {}) as never);
    const { result } = renderHook(useWorkoutGrid, { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await expect(
        result.current.saveEntry({
          exerciseId: "one",
          performedOn: "2026-09-07",
          weightKg: 20,
          setCount: 3,
          repsPerSet: 10,
          maxReps: 10,
        }),
      ).rejects.toThrow("Unavailable");
    });
    expect(result.current.exercises[0].name).toBe("Unchanged");
    expect(result.current.saving).toBe(false);
    expect(result.current.dataVersion).toBe(0);
  });
});
