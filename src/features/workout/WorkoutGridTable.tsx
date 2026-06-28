import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Empty } from "antd";
import type { Exercise, UpsertWorkoutEntryRequest, WorkoutGrid, WorkoutGridRow } from "../../api/types";
import {
  cellVolume,
  heatmapLevel,
  lastSessionForRow,
  rowVolumeRange,
} from "./workoutAnalytics";
import {
  MUSCLE_GROUP_COLORS,
  MUSCLE_GROUP_LABELS,
  MUSCLE_GROUPS,
  normalizeMuscleGroup,
  type MuscleGroup,
} from "./workoutMuscleGroups";
import WorkoutFilledCell, { WorkoutGridEmptyCell } from "./WorkoutGridCell";
import WorkoutGridCellEditorModal from "./WorkoutGridCellEditorModal";
import WorkoutGridDragPreview from "./WorkoutGridDragPreview";
import {
  isValidDropTarget,
  readCellClientRect,
  type WorkoutGridActiveDrag,
  type WorkoutGridCellEditorSession,
  type WorkoutGridDragPayload,
} from "./workoutGridDnD";
import { upsertRequestFromCell, upsertRequestFromValues } from "./workoutEntryPayload";
import { repsPatternFromCell } from "./workoutSetReps";
import { sortGridDatesNewestFirst } from "./workoutGridMutations";

type Props = {
  exercises: Exercise[];
  grid: WorkoutGrid;
  selectedExerciseId?: string;
  loading?: boolean;
  onSelectExercise: (exerciseId: string) => void;
  onMoveCell: (
    from: WorkoutGridDragPayload,
    toExerciseId: string,
    toDate: string,
  ) => void;
  onUpdateCell: (payload: UpsertWorkoutEntryRequest) => void;
  onDeleteCell?: (exerciseId: string, date: string) => void;
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

function readDropTarget(
  clientX: number,
  clientY: number,
): { exerciseId: string; date: string; empty: boolean } | null {
  const el = document.elementFromPoint(clientX, clientY);
  const td = el?.closest("[data-workout-grid-drop]");
  if (!td || !(td instanceof HTMLElement)) {
    return null;
  }
  const exerciseId = td.dataset.exerciseId;
  const date = td.dataset.date;
  if (!exerciseId || !date) {
    return null;
  }
  return {
    exerciseId,
    date,
    empty: td.dataset.empty === "true",
  };
}

function WorkoutGridTable({
  exercises,
  grid,
  selectedExerciseId,
  loading,
  onSelectExercise,
  onMoveCell,
  onUpdateCell,
  onDeleteCell,
}: Props) {
  const [activeDrag, setActiveDrag] = useState<WorkoutGridActiveDrag | null>(null);
  const [dragPointer, setDragPointer] = useState({ x: 0, y: 0 });
  const [dragHoverTarget, setDragHoverTarget] = useState<{
    exerciseId: string;
    date: string;
  } | null>(null);
  const [editorSession, setEditorSession] = useState<WorkoutGridCellEditorSession | null>(null);
  const [clickSuppressed, setClickSuppressed] = useState(false);
  const dragMovedRef = useRef(false);
  const dragHoverRef = useRef<{ exerciseId: string; date: string } | null>(null);

  const displayDates = useMemo(
    () => sortGridDatesNewestFirst(grid.dates),
    [grid.dates],
  );

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
          const range = rowVolumeRange(row);
          const muscleGroup = muscleByExerciseId.get(row.exerciseId) ?? "other";
          return { row, range, muscleGroup };
        }),
      ),
    [grid.rows, muscleByExerciseId],
  );

  const activeDates = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const date of displayDates) {
      map.set(date, columnHasActivity(grid.rows, date));
    }
    return map;
  }, [displayDates, grid.rows]);

  const clearDrag = useCallback(() => {
    setActiveDrag(null);
    setDragHoverTarget(null);
    dragHoverRef.current = null;
    dragMovedRef.current = false;
  }, []);

  const handleMove = useCallback(
    (from: WorkoutGridDragPayload, toExerciseId: string, toDate: string) => {
      setClickSuppressed(true);
      clearDrag();
      onMoveCell(from, toExerciseId, toDate);
      window.setTimeout(() => setClickSuppressed(false), 400);
    },
    [clearDrag, onMoveCell],
  );

  const beginDrag = useCallback(
    (
      payload: WorkoutGridDragPayload,
      display: string,
      previewClass: string,
      clientX: number,
      clientY: number,
    ) => {
      const sourceRect = readCellClientRect(payload.exerciseId, payload.fromDate);
      if (!sourceRect) {
        return;
      }
      setActiveDrag({
        payload,
        display,
        previewClass,
        grabOffsetX: clientX - sourceRect.left,
        grabOffsetY: clientY - sourceRect.top,
        cellWidth: sourceRect.width,
        cellHeight: sourceRect.height,
      });
      setDragPointer({ x: clientX, y: clientY });
      setDragHoverTarget(null);
      dragMovedRef.current = true;
    },
    [],
  );

  const updateDragPointer = useCallback(
    (clientX: number, clientY: number) => {
      dragMovedRef.current = true;
      setDragPointer({ x: clientX, y: clientY });

      if (!activeDrag) {
        return;
      }

      const target = readDropTarget(clientX, clientY);
      if (
        target
        && target.empty
        && isValidDropTarget(activeDrag.payload, target.exerciseId, target.date, false)
      ) {
        const nextHover = { exerciseId: target.exerciseId, date: target.date };
        setDragHoverTarget(nextHover);
        dragHoverRef.current = nextHover;
      } else {
        setDragHoverTarget(null);
        dragHoverRef.current = null;
      }
    },
    [activeDrag],
  );

  const suppressEditorOpen = clickSuppressed || activeDrag != null;

  const handleEditorSave = useCallback(
    (session: WorkoutGridCellEditorSession, weightKg: number, repsPattern: string) => {
      if (session.mode === "edit" && session.cell) {
        onUpdateCell(
          upsertRequestFromCell(session.exerciseId, session.date, session.cell, {
            weightKg,
            repsPattern,
          }),
        );
        return;
      }
      onUpdateCell(
        upsertRequestFromValues(session.exerciseId, session.date, weightKg, repsPattern),
      );
    },
    [onUpdateCell],
  );

  const handleEditorDelete = useCallback(
    (session: WorkoutGridCellEditorSession) => {
      if (onDeleteCell) {
        onDeleteCell(session.exerciseId, session.date);
      }
    },
    [onDeleteCell],
  );

  useEffect(() => {
    if (!activeDrag) {
      return;
    }

    let listenForRelease = false;
    const releaseTimer = window.setTimeout(() => {
      listenForRelease = true;
    }, 0);

    const finishPointerDrag = (clientX: number, clientY: number) => {
      if (!dragMovedRef.current) {
        clearDrag();
        return;
      }
      const hover = dragHoverRef.current;
      if (
        hover
        && isValidDropTarget(activeDrag.payload, hover.exerciseId, hover.date, false)
      ) {
        handleMove(activeDrag.payload, hover.exerciseId, hover.date);
        return;
      }
      const target = readDropTarget(clientX, clientY);
      if (
        target
        && target.empty
        && isValidDropTarget(activeDrag.payload, target.exerciseId, target.date, false)
      ) {
        handleMove(activeDrag.payload, target.exerciseId, target.date);
        return;
      }
      clearDrag();
    };

    const onMouseMove = (event: MouseEvent) => {
      updateDragPointer(event.clientX, event.clientY);
    };

    const onMouseUp = (event: MouseEvent) => {
      if (!listenForRelease) {
        return;
      }
      finishPointerDrag(event.clientX, event.clientY);
    };

    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) {
        return;
      }
      event.preventDefault();
      updateDragPointer(touch.clientX, touch.clientY);
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (!listenForRelease) {
        return;
      }
      const touch = event.changedTouches[0];
      if (!touch) {
        clearDrag();
        return;
      }
      finishPointerDrag(touch.clientX, touch.clientY);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        clearDrag();
      }
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(releaseTimer);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [activeDrag, clearDrag, handleMove, updateDragPointer]);

  if (!loading && grid.rows.length === 0) {
    return (
      <div className="workout-grid">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No workout data yet" />
      </div>
    );
  }

  return (
    <div className={activeDrag ? "workout-grid workout-grid--dragging" : "workout-grid"}>
      {activeDrag ? (
        <WorkoutGridDragPreview
          drag={activeDrag}
          pointer={dragPointer}
          hoverTarget={dragHoverTarget}
        />
      ) : null}
      <WorkoutGridCellEditorModal
        session={editorSession}
        onClose={() => setEditorSession(null)}
        onSave={handleEditorSave}
        onDelete={onDeleteCell ? handleEditorDelete : undefined}
      />
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
          <span className="workout-grid__legend-hint workout-grid__legend-interaction">
            · newest ← left · grip handle to move · click to edit
          </span>
        </div>
      </div>
      <div className="workout-grid__scroll">
        <table className="workout-grid__table">
          <thead>
            <tr>
              <th className="workout-grid__th workout-grid__th--exercise">Exercise</th>
              {displayDates.map((date) => (
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
            {rowMeta.map(({ row, range, muscleGroup }) => {
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
                  {displayDates.map((date) => {
                    const cell = row.cells[date];
                    const lastSession = lastSessionForRow(row, displayDates);
                    const defaultWeightKg = lastSession?.weightKg ?? 20;
                    const defaultRepsPattern = lastSession
                      ? repsPatternFromCell(lastSession)
                      : "10";

                    const dateLabel = formatHeaderDate(date);

                    if (!cell) {
                      return (
                        <WorkoutGridEmptyCell
                          key={date}
                          exerciseId={row.exerciseId}
                          date={date}
                          exerciseName={row.exerciseName}
                          dateLabel={dateLabel}
                          defaultWeightKg={defaultWeightKg}
                          defaultRepsPattern={defaultRepsPattern}
                          suppressOpen={suppressEditorOpen}
                          onSelectExercise={onSelectExercise}
                          onOpenEditor={setEditorSession}
                        />
                      );
                    }

                    const volume = cellVolume(cell);
                    const level = heatmapLevel(volume, range.min, range.max);
                    const cellClass = `workout-grid__cell workout-grid__cell--level-${level}`;

                    const tooltip = [
                      row.exerciseName,
                      formatHeaderDate(date),
                      cell.display,
                      `${volume} kg volume`,
                    ].join(" · ");

                    const isDragSource =
                      activeDrag?.payload.exerciseId === row.exerciseId
                      && activeDrag?.payload.fromDate === date;

                    return (
                      <WorkoutFilledCell
                        key={date}
                        exerciseId={row.exerciseId}
                        date={date}
                        exerciseName={row.exerciseName}
                        dateLabel={dateLabel}
                        cell={cell}
                        cellClass={cellClass}
                        tooltip={tooltip}
                        isDragSource={isDragSource}
                        suppressOpen={suppressEditorOpen}
                        initialRepsPattern={repsPatternFromCell(cell)}
                        onSelectExercise={onSelectExercise}
                        onOpenEditor={setEditorSession}
                        onDragBegin={(clientX, clientY) =>
                          beginDrag(
                            { exerciseId: row.exerciseId, fromDate: date },
                            cell.display,
                            cellClass,
                            clientX,
                            clientY,
                          )
                        }
                      />
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
