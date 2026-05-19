import type { ProgressMetric } from "../../api/types";
import {
  type CompareChartRow,
  type CompareSeries,
  type ProgressPeriod,
  compareTooltipEntries,
  formatMetricValue,
} from "./workoutAnalytics";

type Props = {
  active?: boolean;
  label?: string | number;
  series: CompareSeries[];
  metric: ProgressMetric;
  period: ProgressPeriod;
  chartData: CompareChartRow[];
};

export default function WorkoutCompareChartTooltip({
  active,
  label,
  series,
  metric,
  period,
  chartData,
}: Props) {
  if (!active || label == null || series.length === 0) {
    return null;
  }

  const row = chartData.find((r) => r.label === label);
  if (!row) {
    return null;
  }

  const entries = compareTooltipEntries(series, row.date, period, metric);

  return (
    <div className="workout-chart-tooltip">
      <p className="workout-chart-tooltip__label">{label}</p>
      <ul className="workout-chart-tooltip__list">
        {entries.map((entry) => (
          <li key={entry.exerciseId} className="workout-chart-tooltip__row">
            <span className="workout-chart-tooltip__swatch" style={{ background: entry.color }} />
            <span className="workout-chart-tooltip__name">{entry.name}</span>
            <span
              className={[
                "workout-chart-tooltip__value",
                entry.carried ? "workout-chart-tooltip__value--carried" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {entry.value != null ? formatMetricValue(entry.value, metric) : "—"}
              {entry.carried ? <span className="workout-chart-tooltip__carried"> last</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
