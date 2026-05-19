import { Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { ProgressPoint } from "../../api/types";
import { formatSignedDelta } from "./workoutAnalytics";

type Row = ProgressPoint & {
  key: string;
  weightDelta: number | null;
  volumeDelta: number | null;
};

type Props = {
  points: ProgressPoint[];
};

function formatShortDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function deltaTag(delta: number | null, unit: string) {
  if (delta == null || delta === 0) {
    return <span className="workout-sessions__muted">—</span>;
  }
  const color = delta > 0 ? "success" : "default";
  return <Tag color={color}>{formatSignedDelta(delta, unit)}</Tag>;
}

export default function WorkoutSessionList({ points }: Props) {
  const rows: Row[] = points.map((p, i) => {
    const prev = i > 0 ? points[i - 1] : null;
    return {
      ...p,
      key: p.date,
      weightDelta: prev != null ? p.weightKg - prev.weightKg : null,
      volumeDelta: prev != null ? p.volume - prev.volume : null,
    };
  });

  const columns: ColumnsType<Row> = [
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (date: string) => formatShortDate(date),
    },
    {
      title: "Weight",
      key: "weight",
      render: (_, r) => `${r.weightKg} kg`,
    },
    {
      title: "Sets × reps",
      key: "sets",
      render: (_, r) => `${r.setCount}×${r.repsPerSet}`,
    },
    {
      title: "Max",
      dataIndex: "maxReps",
      key: "maxReps",
    },
    {
      title: "Volume",
      key: "volume",
      render: (_, r) => `${r.volume} kg`,
    },
    {
      title: "Δ weight",
      key: "dw",
      render: (_, r) => deltaTag(r.weightDelta, "kg"),
    },
    {
      title: "Δ vol",
      key: "dv",
      render: (_, r) => deltaTag(r.volumeDelta, "kg"),
    },
  ];

  return (
    <div className="workout-sessions">
      <h3 className="workout-sessions__title">Session history</h3>
      <Table<Row>
        size="small"
        pagination={{ pageSize: 5, hideOnSinglePage: true, size: "small" }}
        columns={columns}
        dataSource={[...rows].reverse()}
        scroll={{ x: true }}
      />
    </div>
  );
}

