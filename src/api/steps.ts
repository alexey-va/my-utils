import { apiClient } from "./client";
import { apiEndpoints } from "./endpoints";
import type { HealthStepsHistory } from "./types";

export function fetchHealthStepsHistory(days = 90): Promise<HealthStepsHistory> {
  const query = days > 0 ? `?days=${days}` : "";
  return apiClient.get<HealthStepsHistory>(`${apiEndpoints.healthSteps}${query}`, {
    skipAuth: true,
  });
}
