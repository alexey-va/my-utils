import { useCallback, useEffect, useState } from "react";
import { message } from "antd";
import { apiClient, ApiError } from "../../api";
import { apiEndpoints } from "../../api/endpoints";
import type {
  Exercise,
  ExerciseProgress,
  UpsertWorkoutEntryRequest,
  WorkoutGrid,
} from "../../api/types";

export function useWorkoutGrid() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [grid, setGrid] = useState<WorkoutGrid>({ dates: [], rows: [] });
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>();
  const [progress, setProgress] = useState<ExerciseProgress | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);
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

  const loadProgress = useCallback(async (exerciseId: string) => {
    setProgressLoading(true);
    try {
      const data = await apiClient.get<ExerciseProgress>(
        apiEndpoints.workouts.exerciseProgress(exerciseId),
      );
      setProgress(data);
    } catch (err) {
      setProgress(null);
      const text = err instanceof ApiError ? err.message : "Failed to load progress";
      message.error(text);
    } finally {
      setProgressLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!selectedExerciseId) {
      setProgress(null);
      return;
    }
    void loadProgress(selectedExerciseId);
  }, [selectedExerciseId, loadProgress, grid]);

  const selectExercise = useCallback((exerciseId: string) => {
    setSelectedExerciseId(exerciseId);
  }, []);

  const addExercise = useCallback(
    async (name: string) => {
      const created = await apiClient.post<Exercise>(apiEndpoints.workouts.exercises, { name });
      message.success(`Added “${created.name}”`);
      await reload();
      setSelectedExerciseId(created.id);
      return created;
    },
    [reload],
  );

  const updateExercise = useCallback(
    async (exerciseId: string, name: string) => {
      setSaving(true);
      try {
        const updated = await apiClient.patch<Exercise>(apiEndpoints.workouts.exercise(exerciseId), {
          name,
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
        if (selectedExerciseId) {
          await loadProgress(selectedExerciseId);
        }
      } catch (err) {
        const text = err instanceof ApiError ? err.message : "Failed to save";
        message.error(text);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [reload, loadProgress, selectedExerciseId],
  );

  return {
    exercises,
    grid,
    loading,
    saving,
    selectedExerciseId,
    selectExercise,
    progress,
    progressLoading,
    addExercise,
    updateExercise,
    deleteExercise,
    saveEntry,
    reload,
  };
}
