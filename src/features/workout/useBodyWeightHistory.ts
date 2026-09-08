import { useCallback, useEffect, useState } from "react";
import { fetchHealthBodyWeightHistory } from "../../api/weight";
import type { HealthBodyWeightHistory } from "../../api/types";

export function useBodyWeightHistory(fetchDays = 0) {
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision(value => value + 1), []);
  const [history, setHistory] = useState<HealthBodyWeightHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchHealthBodyWeightHistory(fetchDays);
        if (!cancelled) {
          setHistory(data);
        }
      } catch (err) {
        if (!cancelled) {
          setHistory(null);
          setError(err instanceof Error ? err.message : "Failed to load body weight");
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
