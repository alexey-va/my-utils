import { memo } from "react";
import { Button, Empty, Popconfirm, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { ProgressPoint } from "../../api/types";
import { formatSignedDelta } from "./workoutAnalytics";
import { useWorkoutLocale } from "./workoutLocale";

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

function deltaTag(delta: number | null, unit: string) {
  if (delta == null || delta === 0) {
    return <span className="workout-sessions__muted">—</span>;
  }
  const color = delta > 0 ? "success" : "default";
  return <Tag color={color}>{formatSignedDelta(delta, unit)}</Tag>;
}

function WorkoutSessionList({ points, exerciseName, loading, onEdit, onDelete }: Props) {
  const { formatDate, t } = useWorkoutLocale();
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
      title: t("common.date"),
      dataIndex: "date",
      key: "date",
      width: "15%",
      ellipsis: true,
      render: (date: string) => formatDate(date),
    },
    {
      title: t("common.weight"),
      key: "weight",
      width: "10%",
      align: "right",
      ellipsis: true,
      render: (_, r) => `${r.weightKg} ${t("common.kg")}`,
    },
    {
      title: t("sessions.setsReps"),
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
      title: t("sessions.max"),
      dataIndex: "maxReps",
      key: "maxReps",
      width: "7%",
      align: "right",
    },
    {
      title: t("common.volume"),
      key: "volume",
      width: "11%",
      align: "right",
      ellipsis: true,
      render: (_, r) => `${r.volume} ${t("common.kg")}`,
    },
    {
      title: t("sessions.deltaWeight"),
      key: "dw",
      width: "12%",
      align: "right",
      render: (_, r) => deltaTag(r.weightDelta, t("common.kg")),
    },
    {
      title: t("sessions.deltaVolume"),
      key: "dv",
      width: "12%",
      align: "right",
      render: (_, r) => deltaTag(r.volumeDelta, t("common.kg")),
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
                {t("common.edit")}
              </Button>
            ) : null}
            {onDelete ? (
              <Popconfirm
                title={t("sessions.deleteTitle")}
                description={t("sessions.deleteDescription", { date: formatDate(r.date) })}
                onConfirm={() => void onDelete(r)}
                okText={t("common.delete")}
                okButtonProps={{ danger: true }}
              >
                <Button type="link" size="small" danger>
                  {t("common.delete")}
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
        ? t("common.loading")
        : t("sessions.selectExercise");

  return (
    <div className="workout-sessions">
      <div className="workout-sessions__head">
        <h3 className="workout-shell__label workout-sessions__title">
          {t("sessions.title")}
        </h3>
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
                description={t("sessions.empty")}
              />
            ),
          }}
        />
      </div>
    </div>
  );
}

export default memo(WorkoutSessionList);
