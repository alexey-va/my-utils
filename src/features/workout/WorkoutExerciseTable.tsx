import { memo, useMemo } from "react";
import { Button, Empty, Popconfirm, Space, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { Exercise, WorkoutGrid, WorkoutGridRow } from "../../api/types";
import { computeRowRecords, lastSessionForRow } from "./workoutAnalytics";
import {
  MUSCLE_GROUP_LABELS,
  normalizeMuscleGroup,
} from "./workoutMuscleGroups";

const TABLE_BODY_HEIGHT = 360;
const PAGE_SIZE = 20;

type Row = {
  key: string;
  exerciseId: string;
  name: string;
  muscleGroupLabel: string;
  sessionCount: number;
  lastDate: string | null;
  lastWeight: number | null;
  bestWeight: number | null;
  bestVolume: number | null;
};

type Props = {
  exercises: Exercise[];
  grid: WorkoutGrid;
  selectedExerciseId?: string;
  loading?: boolean;
  onSelect: (exerciseId: string) => void;
  onEdit: (exercise: Exercise) => void;
  onDelete: (exerciseId: string) => Promise<void>;
};

function formatShortDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function buildRow(
  exercise: Exercise,
  gridRow: WorkoutGridRow | undefined,
  dates: string[],
): Row {
  const muscleGroup = normalizeMuscleGroup(exercise.muscleGroup);
  const sessionCount = gridRow
    ? Object.values(gridRow.cells).filter((cell) => cell != null).length
    : 0;
  const lastCell = gridRow ? lastSessionForRow(gridRow, dates) : undefined;
  let lastDate: string | null = null;
  if (gridRow && lastCell) {
    for (let i = dates.length - 1; i >= 0; i--) {
      const date = dates[i];
      if (gridRow.cells[date] === lastCell) {
        lastDate = date;
        break;
      }
    }
  }
  const records = gridRow ? computeRowRecords(gridRow) : null;

  return {
    key: exercise.id,
    exerciseId: exercise.id,
    name: exercise.name,
    muscleGroupLabel: MUSCLE_GROUP_LABELS[muscleGroup],
    sessionCount,
    lastDate,
    lastWeight: lastCell?.weightKg ?? null,
    bestWeight: records && records.maxWeight > 0 ? records.maxWeight : null,
    bestVolume: records && records.maxVolume > 0 ? records.maxVolume : null,
  };
}

function WorkoutExerciseTable({
  exercises,
  grid,
  selectedExerciseId,
  loading,
  onSelect,
  onEdit,
  onDelete,
}: Props) {
  const rows = useMemo(
    () =>
      exercises.map((exercise) => {
        const gridRow = grid.rows.find((row) => row.exerciseId === exercise.id);
        return buildRow(exercise, gridRow, grid.dates);
      }),
    [exercises, grid],
  );

  const columns: ColumnsType<Row> = [
    {
      title: "Exercise",
      dataIndex: "name",
      key: "name",
      ellipsis: true,
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: "Group",
      dataIndex: "muscleGroupLabel",
      key: "muscleGroup",
      width: 110,
      ellipsis: true,
      sorter: (a, b) => a.muscleGroupLabel.localeCompare(b.muscleGroupLabel),
      filters: [...new Set(rows.map((row) => row.muscleGroupLabel))].map((label) => ({
        text: label,
        value: label,
      })),
      onFilter: (value, record) => record.muscleGroupLabel === value,
    },
    {
      title: "Sessions",
      dataIndex: "sessionCount",
      key: "sessionCount",
      width: 88,
      align: "right",
      sorter: (a, b) => a.sessionCount - b.sessionCount,
    },
    {
      title: "Last",
      key: "lastDate",
      width: 108,
      ellipsis: true,
      render: (_, record) =>
        record.lastDate ? formatShortDate(record.lastDate) : <span className="workout-exercises__muted">—</span>,
      sorter: (a, b) => (a.lastDate ?? "").localeCompare(b.lastDate ?? ""),
    },
    {
      title: "Last kg",
      key: "lastWeight",
      width: 80,
      align: "right",
      render: (_, record) =>
        record.lastWeight != null ? `${record.lastWeight}` : <span className="workout-exercises__muted">—</span>,
      sorter: (a, b) => (a.lastWeight ?? 0) - (b.lastWeight ?? 0),
    },
    {
      title: "Best kg",
      key: "bestWeight",
      width: 80,
      align: "right",
      render: (_, record) =>
        record.bestWeight != null ? `${record.bestWeight}` : <span className="workout-exercises__muted">—</span>,
      sorter: (a, b) => (a.bestWeight ?? 0) - (b.bestWeight ?? 0),
    },
    {
      title: "Best vol",
      key: "bestVolume",
      width: 88,
      align: "right",
      render: (_, record) =>
        record.bestVolume != null ? `${record.bestVolume}` : <span className="workout-exercises__muted">—</span>,
      sorter: (a, b) => (a.bestVolume ?? 0) - (b.bestVolume ?? 0),
    },
    {
      title: "",
      key: "actions",
      width: 148,
      align: "right",
      fixed: "right",
      render: (_, record) => {
        const exercise = exercises.find((item) => item.id === record.exerciseId);
        if (!exercise) {
          return null;
        }
        return (
          <Space size="small">
            <Button type="link" size="small" onClick={() => onSelect(record.exerciseId)}>
              View
            </Button>
            <Button type="link" size="small" onClick={() => onEdit(exercise)}>
              Edit
            </Button>
            <Popconfirm
              title="Delete exercise?"
              description={`Remove “${record.name}” and all its sessions?`}
              onConfirm={() => void onDelete(record.exerciseId)}
              okText="Delete"
              okButtonProps={{ danger: true }}
            >
              <Button type="link" size="small" danger>
                Delete
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div className="workout-exercises">
      <div className="workout-exercises__head">
        <h3 className="workout-shell__label workout-exercises__title">All exercises</h3>
        <span className="workout-exercises__subtitle">{exercises.length} total</span>
      </div>
      <div className="workout-exercises__table-wrap">
        <Table<Row>
          className="workout-exercises__table"
          tableLayout="fixed"
          size="small"
          loading={loading}
          rowClassName={(record) =>
            record.exerciseId === selectedExerciseId ? "workout-exercises__row--selected" : ""
          }
          pagination={{
            pageSize: PAGE_SIZE,
            size: "small",
            hideOnSinglePage: false,
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50", "100"],
          }}
          columns={columns}
          dataSource={rows}
          scroll={{ x: 900, y: TABLE_BODY_HEIGHT }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No exercises — use Add exercise to create one"
              />
            ),
          }}
        />
      </div>
    </div>
  );
}

export default memo(WorkoutExerciseTable);
