import { useCallback, useEffect, useRef, useState } from "react";
import { message } from "antd";
import { apiClient, ApiError } from "../../api";
import { apiEndpoints } from "../../api/endpoints";
import type { ExerciseProgress } from "../../api/types";
import { chartColorForIndex } from "./workoutChartColors";
import type { CompareSeries } from "./workoutAnalytics";
import {
  getWorkoutProgressCache,
  getWorkoutProgressGeneration,
  prefetchExerciseProgress,
} from "./workoutProgressCache";
import { useWorkoutLocale } from "./workoutLocale";

function progressToSeries(
  progress: ExerciseProgress,
  colorIndex: number,
): CompareSeries {
  return {
    exerciseId: progress.exercise.id,
    name: progress.exercise.name,
    points: progress.points,
    color: chartColorForIndex(colorIndex),
  };
}

function orderSeries(
  ids: string[],
  byId: Map<string, CompareSeries>,
): CompareSeries[] {
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

function seriesFromCache(
  ids: string[],
  cache: Map<string, ExerciseProgress>,
): CompareSeries[] {
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
  const { t } = useWorkoutLocale();
  const tRef = useRef(t);
  tRef.current = t;
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
      setSeries((current) =>
        nextSeries.length > 0
          ? nextSeries
          : current.filter((item) => ids.includes(item.exerciseId)),
      );
      const targetId = primaryExerciseId ?? ids[0];
      if (!targetId) {
        setPrimary(null);
        return;
      }
      setPrimary(
        (current) =>
          cache.get(targetId) ??
          (current?.exercise.id === targetId ? current : null),
      );
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
    const generationRef = fetchGenRef;
    const generation = ++generationRef.current;
    const cacheGeneration = getWorkoutProgressGeneration();
    if (!idsKey) {
      setSeries([]);
      setPrimary(null);
      setInitialLoading(false);
      return;
    }

    const ids = idsKey.split(",");
    syncFromCache(ids);

    const missing = ids.filter((id) => !cache.has(id));
    if (missing.length === 0) {
      setInitialLoading(false);
      return;
    }

    setInitialLoading(true);

    void (async () => {
      try {
        const results = await Promise.all(
          missing.map((id) =>
            apiClient.get<ExerciseProgress>(
              apiEndpoints.workouts.exerciseProgress(id),
            ),
          ),
        );

        if (
          fetchGenRef.current !== generation ||
          getWorkoutProgressGeneration() !== cacheGeneration
        )
          return;
        for (const progress of results)
          cache.set(progress.exercise.id, progress);

        syncFromCache(ids);
      } catch (err) {
        if (fetchGenRef.current === generation) {
          const text =
            err instanceof ApiError
              ? err.message
              : tRef.current("message.progressFailed");
          message.error(text);
        }
      } finally {
        if (fetchGenRef.current === generation) {
          setInitialLoading(false);
        }
      }
    })();
    return () => {
      ++generationRef.current;
    };
  }, [idsKey, primaryExerciseId, syncFromCache, cache, refreshKey]);

  return {
    series,
    primary,
    loading: initialLoading,
    prefetchExercise,
  };
}
