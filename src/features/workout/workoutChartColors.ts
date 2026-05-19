/** Distinct line colors for multi-exercise comparison (dark UI). */
export const WORKOUT_CHART_COLORS = [
  "#6b9fff",
  "#52c41a",
  "#c9a227",
  "#b37feb",
  "#36cfc9",
  "#ff9c6e",
] as const;

export function chartColorForIndex(index: number): string {
  return WORKOUT_CHART_COLORS[index % WORKOUT_CHART_COLORS.length];
}
