import { useCallback, useEffect, useRef, useState } from "react";
import { message } from "antd";
import { apiClient, ApiError } from "../../api";
import { apiEndpoints } from "../../api/endpoints";
import type {
  Exercise,
  MoveWorkoutEntryRequest,
  UpsertWorkoutEntryRequest,
  WorkoutGrid,
  WorkoutSnapshot,
} from "../../api/types";
import { sortGridDatesOldestFirst } from "./workoutGridMutations";
import { invalidateWorkoutProgress } from "./workoutProgressCache";
import { useWorkoutLocale } from "./workoutLocale";

export function useWorkoutGrid() {
  const { t } = useWorkoutLocale();
  const tRef = useRef(t);
  tRef.current = t;
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [grid, setGrid] = useState<WorkoutGrid>({ dates: [], rows: [] });
  const [selectedExerciseId, selectExercise] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataVersion, setDataVersion] = useState(0);
  const readGeneration = useRef(0);
  const writePending = useRef(false);

  const reload = useCallback(async (options?: { silent?: boolean }) => {
    const generation = ++readGeneration.current;
    if (!options?.silent) setLoading(true);
    setError(null);
    try {
      const snapshot = await apiClient.get<WorkoutSnapshot>(
        apiEndpoints.workouts.snapshot,
      );
      if (generation !== readGeneration.current) return;
      setExercises(snapshot.exercises);
      setGrid({
        dates: sortGridDatesOldestFirst(snapshot.grid.dates),
        rows: snapshot.grid.rows,
      });
      selectExercise((current) =>
        snapshot.exercises.some((e) => e.id === current)
          ? current
          : snapshot.exercises[0]?.id,
      );
    } catch (err) {
      if (generation === readGeneration.current) {
        setError(
          err instanceof ApiError
            ? err.message
            : tRef.current("message.loadWorkoutFailed"),
        );
      }
    } finally {
      if (generation === readGeneration.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const generationRef = readGeneration;
    void reload();
    return () => {
      ++generationRef.current;
    };
  }, [reload]);

  const write = useCallback(
    async <T>(operation: () => Promise<T>): Promise<T> => {
      if (writePending.current) {
        message.warning(tRef.current("common.saving"));
        throw new Error(tRef.current("common.saving"));
      }
      writePending.current = true;
      ++readGeneration.current;
      setSaving(true);
      try {
        const result = await operation();
        invalidateWorkoutProgress();
        await reload({ silent: true });
        // Refresh after selection is reconciled, including a deleted exercise.
        setDataVersion((version) => version + 1);
        return result;
      } catch (err) {
        message.error(
          err instanceof ApiError
            ? err.message
            : tRef.current("message.saveFailed"),
        );
        throw err;
      } finally {
        writePending.current = false;
        setSaving(false);
      }
    },
    [reload],
  );

  const addExercise = useCallback(
    async (name: string, muscleGroup?: string) => {
      const created = await write(() =>
        apiClient.post<Exercise>(apiEndpoints.workouts.exercises, {
          name,
          muscleGroup,
        }),
      );
      selectExercise(created.id);
      message.success(t("message.exerciseAdded", { name: created.name }));
      return created;
    },
    [write, t],
  );

  const updateExercise = useCallback(
    async (id: string, name: string, muscleGroup?: string) => {
      const updated = await write(() =>
        apiClient.patch<Exercise>(apiEndpoints.workouts.exercise(id), {
          name,
          muscleGroup,
        }),
      );
      selectExercise(updated.id);
      message.success(t("message.exerciseUpdated"));
      return updated;
    },
    [write, t],
  );

  const deleteExercise = useCallback(
    async (id: string) => {
      await write(() => apiClient.delete(apiEndpoints.workouts.exercise(id)));
      message.success(t("message.exerciseRemoved"));
    },
    [write, t],
  );

  const saveEntry = useCallback(
    (body: UpsertWorkoutEntryRequest) =>
      write(() => apiClient.post<void>(apiEndpoints.workouts.entries, body)),
    [write],
  );
  const deleteEntry = useCallback(
    (exerciseId: string, date: string) =>
      write(() =>
        apiClient.delete(apiEndpoints.workouts.entry(exerciseId, date)),
      ),
    [write],
  );

  const moveEntry = useCallback(
    (
      from: { exerciseId: string; fromDate: string },
      toExerciseId: string,
      toDate: string,
    ) => {
      if (from.exerciseId === toExerciseId && from.fromDate === toDate) return;
      if (grid.rows.find((r) => r.exerciseId === toExerciseId)?.cells[toDate]) {
        message.warning(t("message.targetOccupied"));
        return;
      }
      const payload: MoveWorkoutEntryRequest = {
        fromExerciseId: from.exerciseId,
        fromDate: from.fromDate,
        toExerciseId,
        toDate,
      };
      void write(() =>
        apiClient.post<void>(apiEndpoints.workouts.moveEntry, payload),
      ).catch(() => {
        /* write reports errors. */
      });
    },
    [grid, write, t],
  );

  return {
    exercises,
    grid,
    loading,
    saving,
    error,
    dataVersion,
    selectedExerciseId,
    selectExercise,
    addExercise,
    updateExercise,
    deleteExercise,
    saveEntry,
    deleteEntry,
    moveEntry,
    reload,
  };
}
