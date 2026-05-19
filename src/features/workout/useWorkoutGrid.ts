import { useCallback, useEffect, useState } from "react";
import { message } from "antd";
import { apiClient, ApiError } from "../../api";
import { apiEndpoints } from "../../api/endpoints";
import type { Exercise, UpsertWorkoutEntryRequest, WorkoutGrid } from "../../api/types";

export function useWorkoutGrid() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [grid, setGrid] = useState<WorkoutGrid>({ dates: [], rows: [] });
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [exerciseList, gridData] = await Promise.all([
        apiClient.get<Exercise[]>(apiEndpoints.workouts.exercises),
        apiClient.get<WorkoutGrid>(apiEndpoints.workouts.grid),
      ]);
      setExercises(exerciseList);
      setGrid(gridData);
      setSelectedExerciseId((current) => {
        if (current && exerciseList.some((e) => e.id === current)) {
          return current;
        }
        return exerciseList[0]?.id;
      });
    } catch (err) {
      const text = err instanceof ApiError ? err.message : "Failed to load workout data";
      message.error(text);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const selectExercise = useCallback((exerciseId: string) => {
    setSelectedExerciseId(exerciseId);
  }, []);

  const addExercise = useCallback(
    async (name: string, muscleGroup?: string) => {
      const created = await apiClient.post<Exercise>(apiEndpoints.workouts.exercises, {
        name,
        muscleGroup,
      });
      message.success(`Added “${created.name}”`);
      await reload();
      setSelectedExerciseId(created.id);
      return created;
    },
    [reload],
  );

  const updateExercise = useCallback(
    async (exerciseId: string, name: string, muscleGroup?: string) => {
      setSaving(true);
      try {
        const updated = await apiClient.patch<Exercise>(apiEndpoints.workouts.exercise(exerciseId), {
          name,
          muscleGroup,
        });
        message.success("Exercise updated");
        await reload();
        setSelectedExerciseId(updated.id);
        return updated;
      } catch (err) {
        const text = err instanceof ApiError ? err.message : "Failed to update exercise";
        message.error(text);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [reload],
  );

  const deleteExercise = useCallback(
    async (exerciseId: string) => {
      await apiClient.delete(apiEndpoints.workouts.exercise(exerciseId));
      message.success("Exercise removed");
      await reload();
    },
    [reload],
  );

  const saveEntry = useCallback(
    async (body: UpsertWorkoutEntryRequest) => {
      setSaving(true);
      try {
        await apiClient.post<void>(apiEndpoints.workouts.entries, body);
        message.success("Saved");
        await reload();
      } catch (err) {
        const text = err instanceof ApiError ? err.message : "Failed to save";
        message.error(text);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [reload],
  );

  const deleteEntry = useCallback(
    async (exerciseId: string, performedOn: string) => {
      setSaving(true);
      try {
        await apiClient.delete(apiEndpoints.workouts.entry(exerciseId, performedOn));
        message.success("Session removed");
        await reload();
      } catch (err) {
        const text = err instanceof ApiError ? err.message : "Failed to delete session";
        message.error(text);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [reload],
  );

  return {
    exercises,
    grid,
    loading,
    saving,
    selectedExerciseId,
    selectExercise,
    addExercise,
    updateExercise,
    deleteExercise,
    saveEntry,
    deleteEntry,
    reload,
  };
}
