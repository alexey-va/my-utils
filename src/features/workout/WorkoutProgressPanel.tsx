import { memo, useMemo, type ReactNode } from "react";
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
import WorkoutCompareChartTooltip from "./WorkoutCompareChartTooltip";
import {
  type CompareSeries,
  type ProgressPeriod,
  bestE1rmFromPoints,
  buildCompareChartData,
  computeProgressTrends,
  formatSignedDelta,
} from "./workoutAnalytics";
import { useWorkoutLocale } from "./workoutLocale";

const CHART_HEIGHT = 240;

type Props = {
  series: CompareSeries[];
  primary: ExerciseProgress | null;
  loading: boolean;
  metric: ProgressMetric;
  period: ProgressPeriod;
  onMetricChange: (metric: ProgressMetric) => void;
  onPeriodChange: (period: ProgressPeriod) => void;
  onDelete: () => void;
  exerciseControl?: ReactNode;
};

function trendSuffix(delta: number | null, unit: string): ReactNode {
  if (delta == null || delta === 0) {
    return null;
  }
  const positive = delta > 0;
  return (
    <span
      className={`workout-progress__trend ${positive ? "workout-progress__trend--up" : ""}`}
    >
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
  exerciseControl,
}: Props) {
  const { t, localeTag, formatDate } = useWorkoutLocale();
  const axisNumberFormat = useMemo(
    () =>
      new Intl.NumberFormat(localeTag, {
        maximumFractionDigits: metric === "weight" ? 1 : 0,
      }),
    [localeTag, metric],
  );
  const periodOptions = useMemo(
    () => [
      { label: t("period.weeks", { count: 4 }), value: "p4" },
      { label: t("period.weeks", { count: 8 }), value: "p8" },
      { label: t("period.weeks", { count: 12 }), value: "p12" },
      { label: t("common.all"), value: "all" },
    ],
    [t],
  );
  const metricOptions = useMemo(
    () => [
      { label: t("common.volume"), value: "volume" },
      { label: t("common.weight"), value: "weight" },
      { label: t("progress.maxReps"), value: "maxReps" },
    ],
    [t],
  );
  const chartData = buildCompareChartData(series, period, metric);
  const hasChart = chartData.length > 0 && series.length > 0;
  const showChartSpinner = loading && series.length === 0;

  const yDomain = useMemo((): [number, number] | undefined => {
    if (!hasChart) {
      return undefined;
    }
    const values: number[] = [];
    for (const row of chartData) {
      for (const s of series) {
        const value = row[`s_${s.exerciseId}`];
        if (typeof value === "number" && Number.isFinite(value)) {
          values.push(value);
        }
      }
    }
    if (values.length === 0) {
      return undefined;
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || Math.max(min * 0.1, 1);
    return [Math.max(0, min - span * 0.22), max + span * 0.1];
  }, [chartData, hasChart, series]);

  const primaryPoints = primary?.points ?? [];
  const trends = computeProgressTrends(primaryPoints);
  const bestE1rm = bestE1rmFromPoints(primaryPoints);

  if (!loading && series.length === 0 && !exerciseControl) {
    return (
      <div className="workout-progress workout-progress--placeholder">
        <Empty
          className="workout-progress__empty"
          description={t("progress.selectExercise")}
        />
      </div>
    );
  }

  const title = primary?.exercise.name ?? series[0]?.name ?? "…";

  return (
    <div className="workout-progress">
      <div className="workout-progress__header">
        <div className="workout-progress__header-text">
          <p className="workout-progress__eyebrow">{t("progress.title")}</p>
          {exerciseControl ? (
            <div className="workout-progress__exercise">{exerciseControl}</div>
          ) : (
            <h2 className="workout-progress__title">{title}</h2>
          )}
        </div>
        {primary ? (
          <Popconfirm
            title={t("progress.deleteExercise")}
            description={t("progress.deleteExerciseDescription")}
            onConfirm={onDelete}
            okText={t("common.delete")}
            okButtonProps={{ danger: true }}
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              size="small"
              aria-label={t("progress.deleteExercise")}
            />
          </Popconfirm>
        ) : null}
      </div>

      <div className="workout-progress__stats-band">
        <div
          className={`workout-progress__stats${primary ? "" : " workout-progress__stats--placeholder"}`}
          aria-busy={!primary && loading}
        >
          <Statistic
            title={t("progress.sessions")}
            value={primary?.stats.sessions ?? "—"}
          />
          <Statistic
            title={t("progress.bestWeight")}
            value={primary?.stats.bestWeightKg ?? "—"}
            suffix={
              primary?.stats.bestWeightKg != null ? t("common.kg") : undefined
            }
          />
          <div className="workout-progress__stat">
            <Statistic
              title={t("common.latest")}
              value={primary?.stats.latestWeightKg ?? "—"}
              suffix={
                primary?.stats.latestWeightKg != null
                  ? t("common.kg")
                  : undefined
              }
            />
            <div className="workout-progress__stat-delta">
              {trendSuffix(trends.weightVsPrevious, t("common.kg")) ? (
                <>
                  {trendSuffix(trends.weightVsPrevious, t("common.kg"))}
                  <span className="workout-progress__stat-delta-label">
                    {" "}
                    {t("progress.vsPrevious")}
                  </span>
                </>
              ) : (
                <span
                  className="workout-progress__stat-delta-placeholder"
                  aria-hidden
                >
                  —
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <details className="workout-progress__details">
        <summary>{t("overview.moreStats")}</summary>
        <div className="workout-progress__secondary-stats">
          {" "}
          <Statistic
            title={t("progress.weeksAgo", { count: trends.weeksAgoLabel ?? 4 })}
            value={
              trends.weightVsWeeksAgo != null
                ? formatSignedDelta(trends.weightVsWeeksAgo, t("common.kg"))
                : "—"
            }
          />
          <Statistic
            title={t("progress.bestE1rm")}
            value={bestE1rm ?? "—"}
            suffix={bestE1rm != null ? t("common.kg") : undefined}
          />
          <Statistic
            title={t("progress.bestVolume")}
            value={primary?.stats.bestVolume ?? "—"}
            suffix={
              primary?.stats.bestVolume != null ? t("common.kg") : undefined
            }
          />
        </div>
      </details>

      <div className="workout-progress__controls">
        <Segmented
          className="workout-progress__period"
          value={period}
          options={periodOptions}
          onChange={(value) => onPeriodChange(String(value) as ProgressPeriod)}
        />
        <Segmented
          className="workout-progress__metric"
          value={metric}
          options={metricOptions}
          onChange={(value) => onMetricChange(String(value) as ProgressMetric)}
        />
      </div>

      <div className="workout-progress__chart">
        {showChartSpinner ? (
          <div className="workout-progress__chart-placeholder">
            <Spin size="small" />
          </div>
        ) : !hasChart ? (
          <Empty description={t("progress.noSessions")} />
        ) : (
          <div className="workout-progress__chart-inner">
            <ResponsiveContainer
              width="100%"
              height={CHART_HEIGHT}
              debounce={0}
            >
              <LineChart
                data={chartData}
                margin={{ top: 14, right: 12, left: 2, bottom: 14 }}
              >
                <CartesianGrid
                  stroke={"var(--linear-hairline)"}
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date: string) =>
                    formatDate(date, { day: "numeric", month: "short" })
                  }
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--linear-ink-muted)", fontSize: 11 }}
                  tickMargin={6}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value: number) =>
                    axisNumberFormat.format(value)
                  }
                  tick={{ fill: "var(--linear-ink-muted)", fontSize: 11 }}
                  width={44}
                  tickMargin={4}
                  allowDecimals={metric !== "maxReps"}
                  domain={yDomain ?? ["auto", "auto"]}
                  padding={{ top: 8, bottom: 0 }}
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
                    type="linear"
                    dataKey={`s_${s.exerciseId}`}
                    name={`s_${s.exerciseId}`}
                    stroke={s.color}
                    strokeWidth={2.5}
                    dot={
                      s.points.length === 1 || chartData.length === 1
                        ? { r: 4, fill: s.color, strokeWidth: 0 }
                        : false
                    }
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
