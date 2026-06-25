import { memo, type ReactNode } from "react";
import { Button, Empty, Popconfirm, Segmented, Spin, Statistic } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ExerciseProgress, ProgressMetric } from "../../api/types";
import { linearTokens } from "../../design/linearTokens";
import WorkoutCompareChartTooltip from "./WorkoutCompareChartTooltip";
import {
  type CompareSeries,
  type ProgressPeriod,
  bestE1rmFromPoints,
  buildCompareChartData,
  computeProgressTrends,
  formatSignedDelta,
} from "./workoutAnalytics";

const CHART_HEIGHT = 252;

const PERIOD_OPTIONS: { label: string; value: ProgressPeriod }[] = [
  { label: "4 wk", value: "p4" },
  { label: "8 wk", value: "p8" },
  { label: "12 wk", value: "p12" },
  { label: "All", value: "all" },
];

const METRIC_OPTIONS: { label: string; value: ProgressMetric }[] = [
  { label: "Weight", value: "weight" },
  { label: "Max reps", value: "maxReps" },
  { label: "Volume", value: "volume" },
];

type Props = {
  series: CompareSeries[];
  primary: ExerciseProgress | null;
  loading: boolean;
  metric: ProgressMetric;
  period: ProgressPeriod;
  onMetricChange: (metric: ProgressMetric) => void;
  onPeriodChange: (period: ProgressPeriod) => void;
  onDelete: () => void;
};

function trendSuffix(delta: number | null, unit: string): ReactNode {
  if (delta == null || delta === 0) {
    return null;
  }
  const positive = delta > 0;
  return (
    <span className={`workout-progress__trend ${positive ? "workout-progress__trend--up" : ""}`}>
      {formatSignedDelta(delta, unit)}
    </span>
  );
}

function WorkoutProgressPanel({
  series,
  primary,
  loading,
  metric,
  period,
  onMetricChange,
  onPeriodChange,
  onDelete,
}: Props) {
  const chartData = buildCompareChartData(series, period, metric);
  const hasChart = chartData.length > 0 && series.length > 0;
  const showChartSpinner = loading && series.length === 0;

  const primaryPoints = primary?.points ?? [];
  const trends = computeProgressTrends(primaryPoints);
  const bestE1rm = bestE1rmFromPoints(primaryPoints);

  if (!loading && series.length === 0) {
    return (
      <div className="workout-progress workout-progress--placeholder">
        <Empty
          className="workout-progress__empty"
          description="Select an exercise below to see progress"
        />
      </div>
    );
  }

  const title = primary?.exercise.name ?? series[0]?.name ?? "…";

  return (
    <div className="workout-progress">
      <div className="workout-progress__header">
        <div className="workout-progress__header-text">
          <h2 className="workout-progress__title">{title}</h2>
          <p className="workout-progress__hint">Chart uses the period filter below</p>
        </div>
        {primary ? (
          <Popconfirm
            title="Delete this exercise?"
            description="All logged sessions for it will be removed."
            onConfirm={onDelete}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Button danger icon={<DeleteOutlined />} size="small">
              Delete
            </Button>
          </Popconfirm>
        ) : null}
      </div>

      <div className="workout-progress__stats-band">
        <div
          className={`workout-progress__stats${primary ? "" : " workout-progress__stats--placeholder"}`}
          aria-busy={!primary && loading}
        >
          <Statistic title="Sessions" value={primary?.stats.sessions ?? "—"} />
          <Statistic
            title="Best weight"
            value={primary?.stats.bestWeightKg ?? "—"}
            suffix={primary?.stats.bestWeightKg != null ? "kg" : undefined}
          />
          <div className="workout-progress__stat">
            <Statistic
              title="Latest"
              value={primary?.stats.latestWeightKg ?? "—"}
              suffix={primary?.stats.latestWeightKg != null ? "kg" : undefined}
            />
            <div className="workout-progress__stat-delta">
              {trendSuffix(trends.weightVsPrevious, "kg") ? (
                <>
                  {trendSuffix(trends.weightVsPrevious, "kg")}
                  <span className="workout-progress__stat-delta-label"> vs prev</span>
                </>
              ) : (
                <span className="workout-progress__stat-delta-placeholder" aria-hidden>
                  —
                </span>
              )}
            </div>
          </div>
          <Statistic
            title={`vs ${trends.weeksAgoLabel ?? 4} wk ago`}
            value={
              trends.weightVsWeeksAgo != null
                ? formatSignedDelta(trends.weightVsWeeksAgo, "kg")
                : "—"
            }
          />
          <Statistic
            title="Best e1RM"
            value={bestE1rm ?? "—"}
            suffix={bestE1rm != null ? "kg" : undefined}
          />
          <Statistic
            title="Best volume"
            value={primary?.stats.bestVolume ?? "—"}
            suffix={primary?.stats.bestVolume != null ? "kg" : undefined}
          />
        </div>
      </div>

      <div className="workout-progress__controls">
        <Segmented
          className="workout-progress__period"
          value={period}
          options={PERIOD_OPTIONS}
          onChange={(value) => onPeriodChange(String(value) as ProgressPeriod)}
        />
        <Segmented
          className="workout-progress__metric"
          value={metric}
          options={METRIC_OPTIONS}
          onChange={(value) => onMetricChange(String(value) as ProgressMetric)}
        />
      </div>

      <div className="workout-progress__chart">
        {showChartSpinner ? (
          <div className="workout-progress__chart-placeholder">
            <Spin size="small" />
          </div>
        ) : !hasChart ? (
          <Empty description="No sessions in this period — log one below" />
        ) : (
          <div className="workout-progress__chart-inner">
            <ResponsiveContainer width="100%" height={CHART_HEIGHT} debounce={0}>
              <LineChart
                data={chartData}
                margin={{ top: 14, right: 12, left: 2, bottom: 14 }}
              >
                <CartesianGrid stroke={linearTokens.hairline} strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: linearTokens.inkMuted, fontSize: 11 }}
                  tickMargin={6}
                />
                <YAxis
                  tick={{ fill: linearTokens.inkMuted, fontSize: 11 }}
                  width={44}
                  tickMargin={4}
                  allowDecimals={metric !== "maxReps"}
                  domain={["auto", "auto"]}
                  padding={{ top: 12, bottom: 8 }}
                />
                <RechartsTooltip
                  content={(props) => (
                    <WorkoutCompareChartTooltip
                      {...props}
                      series={series}
                      metric={metric}
                      period={period}
                      chartData={chartData}
                    />
                  )}
                />
                {series.map((s) => (
                  <Line
                    key={s.exerciseId}
                    type="monotone"
                    dataKey={`s_${s.exerciseId}`}
                    name={`s_${s.exerciseId}`}
                    stroke={s.color}
                    strokeWidth={2}
                    dot={{ r: 4, fill: s.color, strokeWidth: 0 }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                    connectNulls
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(WorkoutProgressPanel);
