import { useMemo } from "react";
import { Button, Table, Tooltip } from "antd";
import { PlusOutlined, TrophyOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { WorkoutCell, WorkoutGrid, WorkoutGridRow } from "../../api/types";
import WorkoutSparkline from "./WorkoutSparkline";
import type { WorkoutCellTarget } from "./types";
import {
  cellVolume,
  computeRowRecords,
  heatmapLevel,
  rowVolumeRange,
  rowWeightSeries,
} from "./workoutAnalytics";

type TableRow = WorkoutGridRow & { key: string };

function formatColumnDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

const EXERCISE_COL_WIDTH = 200;
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
  const rowRecordsMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeRowRecords>>();
    for (const row of grid.rows) {
      map.set(row.exerciseId, computeRowRecords(row));
    }
    return map;
  }, [grid.rows]);

  const dateColumns: ColumnsType<TableRow> = grid.dates.map((date) => ({
    title: formatColumnDate(date),
    key: date,
    width: DATE_COL_WIDTH,
    align: "center" as const,
    className: "workout-matrix__date-col",
    onCell: (row) => {
      const cell = row.cells[date];
      const records = rowRecordsMap.get(row.exerciseId);
      const flags = records?.byDate.get(date);
      const volRange = rowVolumeRange(row);
      const heat =
        cell && volRange.max > 0
          ? heatmapLevel(cellVolume(cell), volRange.min, volRange.max)
          : 0;

      const classes = [
        "workout-matrix__date-col",
        isSameCell(activeCell, row.exerciseId, date) ? "workout-matrix__date-col--active" : "",
        heat > 0 ? `workout-matrix__date-col--heat-${heat}` : "",
        flags?.isPrWeight ? "workout-matrix__date-col--pr-weight" : "",
        flags?.isPrVolume ? "workout-matrix__date-col--pr-volume" : "",
      ]
        .filter(Boolean)
        .join(" ");

      return {
        onClick: (event: React.MouseEvent) => {
          event.stopPropagation();
          onSelectExercise(row.exerciseId);
          onCellSelect({
            exerciseId: row.exerciseId,
            date,
            cell: row.cells[date],
          });
        },
        className: classes,
      };
    },
    render: (_: unknown, row: TableRow) => {
      const cell: WorkoutCell | undefined = row.cells[date];
      if (!cell?.display) {
        return <span className="workout-matrix__cell workout-matrix__cell--empty">+</span>;
      }
      const records = rowRecordsMap.get(row.exerciseId);
      const flags = records?.byDate.get(date);
      const prTitle = [
        flags?.isPrWeight ? "PR weight" : null,
        flags?.isPrVolume ? "PR volume" : null,
      ]
        .filter(Boolean)
        .join(" · ");

      return (
        <span className="workout-matrix__cell-inner">
          {flags?.isPrWeight || flags?.isPrVolume ? (
            <Tooltip title={prTitle}>
              <TrophyOutlined className="workout-matrix__pr-icon" aria-label={prTitle} />
            </Tooltip>
          ) : null}
          <span className="workout-matrix__cell">{cell.display}</span>
        </span>
      );
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
        onClick: (event: React.MouseEvent) => {
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
      render: (_: unknown, row: TableRow) => {
        const series = rowWeightSeries(row, grid.dates);
        return (
          <span className="workout-matrix__exercise-cell">
            <span className="workout-matrix__exercise-name" title={row.exerciseName}>
              {row.exerciseName}
            </span>
            <WorkoutSparkline values={series} />
          </span>
        );
      },
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
