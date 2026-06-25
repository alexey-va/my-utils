import { memo, useMemo } from "react";
import { Empty, Tooltip } from "antd";
import type { Exercise, WorkoutCell, WorkoutGrid, WorkoutGridRow } from "../../api/types";
import {
  cellVolume,
  computeRowRecords,
  heatmapLevel,
  rowVolumeRange,
} from "./workoutAnalytics";
import {
  MUSCLE_GROUP_COLORS,
  MUSCLE_GROUP_LABELS,
  MUSCLE_GROUPS,
  normalizeMuscleGroup,
  type MuscleGroup,
} from "./workoutMuscleGroups";

type Props = {
  exercises: Exercise[];
  grid: WorkoutGrid;
  selectedExerciseId?: string;
  loading?: boolean;
  onSelectExercise: (exerciseId: string) => void;
  onEditCell?: (exerciseId: string, exerciseName: string, date: string, cell: WorkoutCell) => void;
};

function formatHeaderDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function columnHasActivity(rows: WorkoutGridRow[], date: string): boolean {
  return rows.some((row) => row.cells[date] != null);
}

const MUSCLE_GROUP_ORDER = new Map<MuscleGroup, number>(
  MUSCLE_GROUPS.map((group, index) => [group, index]),
);

function sortRowsByMuscleGroup<T extends { muscleGroup: MuscleGroup; row: WorkoutGridRow }>(
  rows: T[],
): T[] {
  return [...rows].sort((a, b) => {
    const groupDelta =
      (MUSCLE_GROUP_ORDER.get(a.muscleGroup) ?? MUSCLE_GROUPS.length)
      - (MUSCLE_GROUP_ORDER.get(b.muscleGroup) ?? MUSCLE_GROUPS.length);
    if (groupDelta !== 0) {
      return groupDelta;
    }
    return a.row.exerciseName.localeCompare(b.row.exerciseName, undefined, { sensitivity: "base" });
  });
}

function WorkoutGridTable({
  exercises,
  grid,
  selectedExerciseId,
  loading,
  onSelectExercise,
  onEditCell,
}: Props) {
  const muscleByExerciseId = useMemo(
    () =>
      new Map(
        exercises.map((exercise) => [
          exercise.id,
          normalizeMuscleGroup(exercise.muscleGroup),
        ]),
      ),
    [exercises],
  );

  const rowMeta = useMemo(
    () =>
      sortRowsByMuscleGroup(
        grid.rows.map((row) => {
          const records = computeRowRecords(row);
          const range = rowVolumeRange(row);
          const muscleGroup = muscleByExerciseId.get(row.exerciseId) ?? "other";
          return { row, records, range, muscleGroup };
        }),
      ),
    [grid.rows, muscleByExerciseId],
  );

  const activeDates = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const date of grid.dates) {
      map.set(date, columnHasActivity(grid.rows, date));
    }
    return map;
  }, [grid.dates, grid.rows]);

  if (!loading && grid.rows.length === 0) {
    return (
      <div className="workout-grid">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No workout data yet" />
      </div>
    );
  }

  return (
    <div className="workout-grid">
      <div className="workout-grid__head">
        <h3 className="workout-shell__label workout-grid__title">Training grid</h3>
        <div className="workout-grid__legend" aria-label="Volume intensity legend">
          <span className="workout-grid__legend-label">Volume</span>
          <span className="workout-grid__legend-swatch workout-grid__cell--level-0" aria-hidden />
          <span className="workout-grid__legend-swatch workout-grid__cell--level-1" aria-hidden />
          <span className="workout-grid__legend-swatch workout-grid__cell--level-2" aria-hidden />
          <span className="workout-grid__legend-swatch workout-grid__cell--level-3" aria-hidden />
          <span className="workout-grid__legend-swatch workout-grid__cell--level-4" aria-hidden />
          <span className="workout-grid__legend-swatch workout-grid__cell--level-5" aria-hidden />
          <span className="workout-grid__legend-hint">low → high</span>
          <span className="workout-grid__legend-pr" aria-hidden />
          <span className="workout-grid__legend-hint">PR</span>
        </div>
      </div>
      <div className="workout-grid__scroll">
        <table className="workout-grid__table">
          <thead>
            <tr>
              <th className="workout-grid__th workout-grid__th--exercise">Exercise</th>
              {grid.dates.map((date) => (
                <th
                  key={date}
                  className={
                    activeDates.get(date)
                      ? "workout-grid__th workout-grid__th--date workout-grid__th--active"
                      : "workout-grid__th workout-grid__th--date"
                  }
                >
                  <span className="workout-grid__th-date">{formatHeaderDate(date)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowMeta.map(({ row, records, range, muscleGroup }) => {
              const isSelected = row.exerciseId === selectedExerciseId;
              const groupColor = MUSCLE_GROUP_COLORS[muscleGroup];

              return (
                <tr
                  key={row.exerciseId}
                  className={isSelected ? "workout-grid__row--selected" : undefined}
                >
                  <th
                    className="workout-grid__exercise"
                    style={{ borderLeftColor: groupColor }}
                  >
                    <button
                      type="button"
                      className="workout-grid__exercise-btn"
                      onClick={() => onSelectExercise(row.exerciseId)}
                    >
                      <span className="workout-grid__exercise-name">{row.exerciseName}</span>
                      <span className="workout-grid__exercise-group">
                        {MUSCLE_GROUP_LABELS[muscleGroup]}
                      </span>
                    </button>
                  </th>
                  {grid.dates.map((date) => {
                    const cell = row.cells[date];
                    if (!cell) {
                      return (
                        <td key={date} className="workout-grid__cell workout-grid__cell--empty" />
                      );
                    }

                    const volume = cellVolume(cell);
                    const level = heatmapLevel(volume, range.min, range.max);
                    const flags = records.byDate.get(date);
                    const isPr = flags?.isPrWeight || flags?.isPrVolume;
                    const cellClass = [
                      "workout-grid__cell",
                      `workout-grid__cell--level-${level}`,
                      isPr ? "workout-grid__cell--pr" : "",
                    ]
                      .filter(Boolean)
                      .join(" ");

                    const tooltip = [
                      row.exerciseName,
                      formatHeaderDate(date),
                      cell.display,
                      `${volume} kg volume`,
                      flags?.isPrWeight ? "PR weight" : null,
                      flags?.isPrVolume ? "PR volume" : null,
                    ]
                      .filter(Boolean)
                      .join(" · ");

                    return (
                      <td key={date} className={cellClass}>
                        <Tooltip title={tooltip} placement="top">
                          <button
                            type="button"
                            className="workout-grid__cell-btn"
                            onClick={() => {
                              onSelectExercise(row.exerciseId);
                              if (onEditCell) {
                                onEditCell(row.exerciseId, row.exerciseName, date, cell);
                              }
                            }}
                          >
                            {cell.display}
                          </button>
                        </Tooltip>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default memo(WorkoutGridTable);
