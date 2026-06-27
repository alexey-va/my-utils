import { memo } from "react";
import { Button, Empty, Popconfirm, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { ProgressPoint } from "../../api/types";
import { formatSignedDelta } from "./workoutAnalytics";

type Row = ProgressPoint & {
  key: string;
  weightDelta: number | null;
  volumeDelta: number | null;
};

const TABLE_BODY_HEIGHT = 320;
const PAGE_SIZE = 10;

type Props = {
  points: ProgressPoint[];
  exerciseName?: string;
  loading?: boolean;
  onEdit?: (point: ProgressPoint) => void;
  onDelete?: (point: ProgressPoint) => Promise<void>;
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

function WorkoutSessionList({ points, exerciseName, loading, onEdit, onDelete }: Props) {
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
      width: "15%",
      ellipsis: true,
      render: (date: string) => formatShortDate(date),
    },
    {
      title: "Weight",
      key: "weight",
      width: "10%",
      align: "right",
      ellipsis: true,
      render: (_, r) => `${r.weightKg} kg`,
    },
    {
      title: "Sets × reps",
      key: "sets",
      width: "12%",
      align: "center",
      ellipsis: true,
      render: (_, r) =>
        r.setReps?.length
          ? r.setReps.join("/")
          : `${r.setCount}×${r.repsPerSet}`,
    },
    {
      title: "Max",
      dataIndex: "maxReps",
      key: "maxReps",
      width: "7%",
      align: "right",
    },
    {
      title: "Volume",
      key: "volume",
      width: "11%",
      align: "right",
      ellipsis: true,
      render: (_, r) => `${r.volume} kg`,
    },
    {
      title: "Δ weight",
      key: "dw",
      width: "12%",
      align: "right",
      render: (_, r) => deltaTag(r.weightDelta, "kg"),
    },
    {
      title: "Δ vol",
      key: "dv",
      width: "12%",
      align: "right",
      render: (_, r) => deltaTag(r.volumeDelta, "kg"),
    },
    {
      title: "",
      key: "actions",
      width: "15%",
      align: "right",
      render: (_, r) =>
        onEdit || onDelete ? (
          <Space size="small">
            {onEdit ? (
              <Button type="link" size="small" onClick={() => onEdit(r)}>
                Edit
              </Button>
            ) : null}
            {onDelete ? (
              <Popconfirm
                title="Delete this session?"
                description={`Remove session on ${formatShortDate(r.date)}?`}
                onConfirm={() => void onDelete(r)}
                okText="Delete"
                okButtonProps={{ danger: true }}
              >
                <Button type="link" size="small" danger>
                  Delete
                </Button>
              </Popconfirm>
            ) : null}
          </Space>
        ) : null,
    },
  ];

  const dataSource = [...rows].reverse();

  const subtitle =
    exerciseName != null
      ? exerciseName
      : loading
        ? "Loading…"
        : "Select an exercise above";

  return (
    <div className="workout-sessions">
      <div className="workout-sessions__head">
        <h3 className="workout-shell__label workout-sessions__title">Sessions</h3>
        <span className="workout-sessions__subtitle">{subtitle}</span>
      </div>
      <div className="workout-sessions__table-wrap">
        <Table<Row>
          className="workout-sessions__table"
          tableLayout="fixed"
          size="small"
          pagination={{
            pageSize: PAGE_SIZE,
            size: "small",
            hideOnSinglePage: false,
            showSizeChanger: false,
          }}
          columns={columns}
          dataSource={dataSource}
          scroll={{ y: TABLE_BODY_HEIGHT }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No sessions — use Log session to add one"
              />
            ),
          }}
        />
      </div>
    </div>
  );
}

export default memo(WorkoutSessionList);
