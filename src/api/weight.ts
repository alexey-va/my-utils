import { apiClient } from "./client";
import { apiEndpoints } from "./endpoints";
import type { HealthBodyWeightHistory } from "./types";

export function fetchHealthBodyWeightHistory(days = 90): Promise<HealthBodyWeightHistory> {
  const query = days > 0 ? `?days=${days}` : "";
  return apiClient.get<HealthBodyWeightHistory>(`${apiEndpoints.healthWeight}${query}`, {
    skipAuth: true,
  });
}
