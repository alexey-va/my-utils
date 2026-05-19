import { Button, Table } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { WorkoutCell, WorkoutGrid, WorkoutGridRow } from "../../api/types";
import type { WorkoutCellTarget } from "./types";

type TableRow = WorkoutGridRow & { key: string };

function formatColumnDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

const EXERCISE_COL_WIDTH = 160;
const DATE_COL_WIDTH = 108;

type Props = {
  grid: WorkoutGrid;
  loading: boolean;
  selectedExerciseId?: string;
  activeCell?: WorkoutCellTarget;
  activeExerciseId?: string;
  onSelectExercise: (exerciseId: string) => void;
  onCellSelect: (target: WorkoutCellTarget) => void;
  onExerciseSelect: (exerciseId: string, exerciseName: string) => void;
  onAddExercise: () => void;
};

function isSameCell(a: WorkoutCellTarget | undefined, exerciseId: string, date: string): boolean {
  return a?.exerciseId === exerciseId && a?.date === date;
}

export default function WorkoutMatrixTable({
  grid,
  loading,
  selectedExerciseId,
  activeCell,
  activeExerciseId,
  onSelectExercise,
  onCellSelect,
  onExerciseSelect,
  onAddExercise,
}: Props) {
  const dateColumns: ColumnsType<TableRow> = grid.dates.map((date) => ({
    title: formatColumnDate(date),
    key: date,
    width: DATE_COL_WIDTH,
    align: "center" as const,
    className: "workout-matrix__date-col",
    onCell: (row) => ({
      onClick: (event) => {
        event.stopPropagation();
        onSelectExercise(row.exerciseId);
        onCellSelect({
          exerciseId: row.exerciseId,
          date,
          cell: row.cells[date],
        });
      },
      className: [
        "workout-matrix__date-col",
        isSameCell(activeCell, row.exerciseId, date) ? "workout-matrix__date-col--active" : "",
      ]
        .filter(Boolean)
        .join(" "),
    }),
    render: (_: unknown, row: TableRow) => {
      const cell: WorkoutCell | undefined = row.cells[date];
      if (!cell?.display) {
        return <span className="workout-matrix__cell workout-matrix__cell--empty">+</span>;
      }
      return <span className="workout-matrix__cell">{cell.display}</span>;
    },
  }));

  const columns: ColumnsType<TableRow> = [
    {
      title: "Exercise",
      key: "exercise",
      fixed: "left",
      width: EXERCISE_COL_WIDTH,
      ellipsis: true,
      className: "workout-matrix__exercise-col",
      onCell: (row) => ({
        onClick: (event) => {
          event.stopPropagation();
          onSelectExercise(row.exerciseId);
          onExerciseSelect(row.exerciseId, row.exerciseName);
        },
        className: [
          "workout-matrix__exercise-col",
          row.exerciseId === activeExerciseId ? "workout-matrix__exercise-col--active" : "",
        ]
          .filter(Boolean)
          .join(" "),
      }),
      render: (_: unknown, row: TableRow) => (
        <span className="workout-matrix__exercise-name" title={row.exerciseName}>
          {row.exerciseName}
        </span>
      ),
    },
    ...dateColumns,
  ];

  const dataSource: TableRow[] = grid.rows.map((row) => ({
    ...row,
    key: row.exerciseId,
  }));

  const scrollX = EXERCISE_COL_WIDTH + grid.dates.length * DATE_COL_WIDTH;

  return (
    <div className="workout-matrix-table">
      <Table<TableRow>
        className="workout-matrix"
        columns={columns}
        dataSource={dataSource}
        loading={loading}
        pagination={false}
        scroll={{ x: scrollX }}
        bordered
        size="small"
        tableLayout="fixed"
        rowClassName={(row) =>
          row.exerciseId === selectedExerciseId ? "workout-matrix__row--selected" : ""
        }
        locale={{
          emptyText: "No exercises yet — add one below.",
        }}
      />
      <Button
        type="dashed"
        className="workout-matrix__add-exercise"
        icon={<PlusOutlined />}
        block
        onClick={onAddExercise}
      >
        Add exercise
      </Button>
    </div>
  );
}
