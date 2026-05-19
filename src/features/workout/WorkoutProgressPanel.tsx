import { Button, Empty, Popconfirm, Segmented, Statistic } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ExerciseProgress, ProgressMetric } from "../../api/types";

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
  onMetricChange: (metric: ProgressMetric) => void;
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

export default function WorkoutProgressPanel({
  progress,
  loading,
  metric,
  onMetricChange,
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

  const chartData: ChartRow[] =
    progress?.points.map((p) => ({
      date: p.date,
      label: formatShortDate(p.date),
      weightKg: p.weightKg,
      maxReps: p.maxReps,
      volume: p.volume,
    })) ?? [];

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
        <Statistic title="Sessions" value={progress?.stats.sessions ?? "—"} />
        <Statistic
          title="Best weight"
          value={progress?.stats.bestWeightKg ?? "—"}
          suffix={progress?.stats.bestWeightKg != null ? "kg" : undefined}
        />
        <Statistic
          title="Latest"
          value={progress?.stats.latestWeightKg ?? "—"}
          suffix={progress?.stats.latestWeightKg != null ? "kg" : undefined}
        />
        <Statistic title="Best max" value={progress?.stats.bestMaxReps ?? "—"} />
      </div>

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
          <Empty description="No sessions yet — log one below" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart
              key={`${progress?.exercise.id ?? "none"}-${metric}`}
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
              <Tooltip
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
    </div>
  );
}
