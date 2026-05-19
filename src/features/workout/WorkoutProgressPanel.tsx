import type { ReactNode } from "react";
import { Button, Empty, Popconfirm, Segmented, Statistic } from "antd";
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
import WorkoutSessionList from "./WorkoutSessionList";
import {
  type ProgressPeriod,
  computeProgressTrends,
  filterPointsByPeriod,
  formatSignedDelta,
} from "./workoutAnalytics";

type ChartRow = {
  date: string;
  label: string;
  weightKg: number;
  maxReps: number;
  volume: number;
};

type Props = {
  progress: ExerciseProgress | null;
  loading: boolean;
  metric: ProgressMetric;
  period: ProgressPeriod;
  onMetricChange: (metric: ProgressMetric) => void;
  onPeriodChange: (period: ProgressPeriod) => void;
  onDelete: () => void;
};

function formatShortDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function metricLabel(metric: ProgressMetric): string {
  switch (metric) {
    case "weight":
      return "Weight (kg)";
    case "maxReps":
      return "Max reps";
    case "volume":
      return "Volume";
  }
}

function chartDataKey(metric: ProgressMetric): keyof ChartRow {
  if (metric === "weight") {
    return "weightKg";
  }
  return metric;
}

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

export default function WorkoutProgressPanel({
  progress,
  loading,
  metric,
  period,
  onMetricChange,
  onPeriodChange,
  onDelete,
}: Props) {
  if (!progress && !loading) {
    return (
      <div className="workout-progress workout-progress--placeholder">
        <Empty
          className="workout-progress__empty"
          description="Select an exercise row to see progress"
        />
      </div>
    );
  }

  const allPoints = progress?.points ?? [];
  const filteredPoints = filterPointsByPeriod(allPoints, period);
  const trends = computeProgressTrends(allPoints);

  const chartData: ChartRow[] = filteredPoints.map((p) => ({
    date: p.date,
    label: formatShortDate(p.date),
    weightKg: p.weightKg,
    maxReps: p.maxReps,
    volume: p.volume,
  }));

  const yKey = chartDataKey(metric);
  const hasChart = chartData.length > 0;

  return (
    <div className="workout-progress">
      <div className="workout-progress__header">
        <div>
          <h2 className="workout-progress__title">{progress?.exercise.name ?? "…"}</h2>
          <p className="workout-progress__hint">Click another row in the table to compare exercises</p>
        </div>
        {progress ? (
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

      <div className="workout-progress__stats">
        <Statistic
          title="Sessions"
          value={progress?.stats.sessions ?? "—"}
        />
        <Statistic
          title="Best weight"
          value={progress?.stats.bestWeightKg ?? "—"}
          suffix={progress?.stats.bestWeightKg != null ? "kg" : undefined}
        />
        <div className="workout-progress__stat">
          <Statistic
            title="Latest"
            value={progress?.stats.latestWeightKg ?? "—"}
            suffix={progress?.stats.latestWeightKg != null ? "kg" : undefined}
          />
          {trendSuffix(trends.weightVsPrevious, "kg") ? (
            <div className="workout-progress__stat-delta">
              {trendSuffix(trends.weightVsPrevious, "kg")}
              <span className="workout-progress__stat-delta-label"> vs prev</span>
            </div>
          ) : null}
        </div>
        <Statistic
          title={`vs ${trends.weeksAgoLabel ?? 4} wk ago`}
          value={
            trends.weightVsWeeksAgo != null
              ? formatSignedDelta(trends.weightVsWeeksAgo, "kg")
              : "—"
          }
        />
        <Statistic title="Best max reps" value={progress?.stats.bestMaxReps ?? "—"} />
        <Statistic
          title="Best volume"
          value={progress?.stats.bestVolume ?? "—"}
          suffix={progress?.stats.bestVolume != null ? "kg" : undefined}
        />
      </div>

      <Segmented
        className="workout-progress__period"
        value={period}
        onChange={(value) => onPeriodChange(value as ProgressPeriod)}
        options={[
          { label: "4 wk", value: "4" },
          { label: "8 wk", value: "8" },
          { label: "12 wk", value: "12" },
          { label: "All", value: "all" },
        ]}
      />

      <Segmented
        className="workout-progress__metric"
        value={metric}
        onChange={(value) => onMetricChange(value as ProgressMetric)}
        options={[
          { label: "Weight", value: "weight" },
          { label: "Max reps", value: "maxReps" },
          { label: "Volume", value: "volume" },
        ]}
      />

      <div className="workout-progress__chart">
        {!hasChart ? (
          <Empty description="No sessions in this period — log one below" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart
              key={`${progress?.exercise.id ?? "none"}-${metric}-${period}`}
              data={chartData}
              margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
            >
              <CartesianGrid stroke="#2a3142" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fill: "#8b93a1", fontSize: 11 }} />
              <YAxis
                tick={{ fill: "#8b93a1", fontSize: 11 }}
                width={40}
                allowDecimals={metric !== "maxReps"}
              />
              <RechartsTooltip
                contentStyle={{
                  background: "#1c2333",
                  border: "1px solid #2a3142",
                  borderRadius: 8,
                }}
                labelStyle={{ color: "#eef2f7" }}
                formatter={(value: number) => [value, metricLabel(metric)]}
              />
              <Line
                type="monotone"
                dataKey={yKey}
                stroke="#6b9fff"
                strokeWidth={2}
                dot={{ r: 4, fill: "#6b9fff" }}
                activeDot={{ r: 6 }}
                isAnimationActive
                animationDuration={280}
                animationEasing="ease-out"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <WorkoutSessionList points={filteredPoints} />
    </div>
  );
}
