import { apiClient } from "../../api";
import { apiEndpoints } from "../../api/endpoints";
import type { ExerciseProgress } from "../../api/types";

const cache = new Map<string, ExerciseProgress>();
const inflight = new Map<string, Promise<ExerciseProgress>>();

export function getWorkoutProgressCache(): Map<string, ExerciseProgress> {
  return cache;
}

export function prefetchExerciseProgress(
  exerciseId: string,
  onLoaded?: (progress: ExerciseProgress) => void,
): void {
  if (!exerciseId) {
    return;
  }

  const cached = cache.get(exerciseId);
  if (cached) {
    onLoaded?.(cached);
    return;
  }

  let pending = inflight.get(exerciseId);
  if (!pending) {
    pending = apiClient
      .get<ExerciseProgress>(apiEndpoints.workouts.exerciseProgress(exerciseId))
      .then((progress) => {
        cache.set(progress.exercise.id, progress);
        inflight.delete(exerciseId);
        return progress;
      })
      .catch((err) => {
        inflight.delete(exerciseId);
        throw err;
      });
    inflight.set(exerciseId, pending);
  }

  if (onLoaded) {
    void pending.then(onLoaded).catch(() => {
      /* hover prefetch — ignore */
    });
  }
}
