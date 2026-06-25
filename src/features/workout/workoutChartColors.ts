import { linearChartColors } from "../../design/linearTokens";

/** Distinct line colors for multi-exercise comparison (Linear semantic palette). */
export const WORKOUT_CHART_COLORS = linearChartColors;

export function chartColorForIndex(index: number): string {
  return WORKOUT_CHART_COLORS[index % WORKOUT_CHART_COLORS.length];
}
