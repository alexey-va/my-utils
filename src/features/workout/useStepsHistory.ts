import { useCallback, useEffect, useState } from "react";
import { fetchHealthStepsHistory } from "../../api/steps";
import type { HealthStepsHistory } from "../../api/types";

export function useStepsHistory(fetchDays = 0) {
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision(value => value + 1), []);
  const [history, setHistory] = useState<HealthStepsHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchHealthStepsHistory(fetchDays);
        if (!cancelled) {
          setHistory(data);
        }
      } catch (err) {
        if (!cancelled) {
          setHistory(null);
          setError(err instanceof Error ? err.message : "Failed to load steps");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchDays, revision]);

  return { history, loading, error, retry };
}
