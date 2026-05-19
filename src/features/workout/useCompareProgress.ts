import { useCallback, useEffect, useRef, useState } from "react";
import { message } from "antd";
import { apiClient, ApiError } from "../../api";
import { apiEndpoints } from "../../api/endpoints";
import type { ExerciseProgress } from "../../api/types";
import { chartColorForIndex } from "./workoutChartColors";
import type { CompareSeries } from "./workoutAnalytics";
import { getWorkoutProgressCache, prefetchExerciseProgress } from "./workoutProgressCache";

function progressToSeries(progress: ExerciseProgress, colorIndex: number): CompareSeries {
  return {
    exerciseId: progress.exercise.id,
    name: progress.exercise.name,
    points: progress.points,
    color: chartColorForIndex(colorIndex),
  };
}

function orderSeries(ids: string[], byId: Map<string, CompareSeries>): CompareSeries[] {
  return ids
    .map((id, index) => {
      const item = byId.get(id);
      if (!item) {
        return undefined;
      }
      return { ...item, color: chartColorForIndex(index) };
    })
    .filter((s): s is CompareSeries => s != null);
}

function seriesFromCache(ids: string[], cache: Map<string, ExerciseProgress>): CompareSeries[] {
  const byId = new Map<string, CompareSeries>();
  for (const id of ids) {
    const progress = cache.get(id);
    if (progress) {
      byId.set(id, progressToSeries(progress, ids.indexOf(id)));
    }
  }
  return orderSeries(ids, byId);
}

export function useCompareProgress(
  exerciseIds: string[],
  primaryExerciseId?: string,
  refreshKey = 0,
) {
  const cache = getWorkoutProgressCache();
  const [series, setSeries] = useState<CompareSeries[]>([]);
  const [primary, setPrimary] = useState<ExerciseProgress | null>(null);
  const [initialLoading, setInitialLoading] = useState(false);
  const fetchGenRef = useRef(0);
  const exerciseIdsRef = useRef(exerciseIds);
  exerciseIdsRef.current = exerciseIds;

  const idsKey = exerciseIds.join(",");

  const syncFromCache = useCallback(
    (ids: string[]) => {
      const nextSeries = seriesFromCache(ids, cache);
      setSeries(nextSeries);
      const targetId = primaryExerciseId ?? ids[0];
      setPrimary(targetId ? (cache.get(targetId) ?? null) : null);
    },
    [cache, primaryExerciseId],
  );

  const prefetchExercise = useCallback(
    (exerciseId: string) => {
      prefetchExerciseProgress(exerciseId, () => {
        const ids = exerciseIdsRef.current;
        if (!ids.includes(exerciseId)) {
          return;
        }
        syncFromCache(ids);
      });
    },
    [syncFromCache],
  );

  useEffect(() => {
    if (!idsKey) {
      setSeries([]);
      setPrimary(null);
      setInitialLoading(false);
      return;
    }

    const ids = idsKey.split(",");
    const generation = ++fetchGenRef.current;

    syncFromCache(ids);

    const missing = ids.filter((id) => !cache.has(id));
    if (missing.length === 0) {
      return;
    }

    const hasAnyCached = seriesFromCache(ids, cache).length > 0;
    if (!hasAnyCached) {
      setInitialLoading(true);
    }

    void (async () => {
      try {
        const results = await Promise.all(
          missing.map((id) =>
            apiClient.get<ExerciseProgress>(apiEndpoints.workouts.exerciseProgress(id)),
          ),
        );

        for (const progress of results) {
          cache.set(progress.exercise.id, progress);
        }

        if (fetchGenRef.current !== generation) {
          return;
        }

        syncFromCache(ids);
      } catch (err) {
        if (fetchGenRef.current === generation) {
          const text = err instanceof ApiError ? err.message : "Failed to load progress";
          message.error(text);
        }
      } finally {
        if (fetchGenRef.current === generation) {
          setInitialLoading(false);
        }
      }
    })();
  }, [idsKey, primaryExerciseId, syncFromCache, cache]);

  useEffect(() => {
    if (refreshKey === 0 || !idsKey) {
      return;
    }

    const ids = idsKey.split(",");
    const generation = ++fetchGenRef.current;

    void (async () => {
      try {
        const results = await Promise.all(
          ids.map((id) =>
            apiClient.get<ExerciseProgress>(apiEndpoints.workouts.exerciseProgress(id)),
          ),
        );

        for (const progress of results) {
          cache.set(progress.exercise.id, progress);
        }

        if (fetchGenRef.current !== generation) {
          return;
        }

        syncFromCache(ids);
      } catch (err) {
        if (fetchGenRef.current === generation) {
          const text = err instanceof ApiError ? err.message : "Failed to load progress";
          message.error(text);
        }
      }
    })();
  }, [refreshKey, idsKey, syncFromCache, cache]);

  return {
    series,
    primary,
    loading: initialLoading,
    prefetchExercise,
  };
}
