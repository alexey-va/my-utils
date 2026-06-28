import type { MouseEvent, TouchEvent } from "react";
import type { WorkoutCell } from "../../api/types";
import type { WorkoutGridCellEditorSession } from "./workoutGridDnD";

export type WorkoutGridFilledCellProps = {
  exerciseId: string;
  date: string;
  exerciseName: string;
  dateLabel: string;
  cell: WorkoutCell;
  cellClass: string;
  tooltip: string;
  isDragSource: boolean;
  suppressOpen?: boolean;
  onSelectExercise: (exerciseId: string) => void;
  onOpenEditor: (session: WorkoutGridCellEditorSession) => void;
  onDragPointerDown?: (clientX: number, clientY: number) => void;
  initialRepsPattern: string;
};

export default function WorkoutGridFilledCell({
  exerciseId,
  date,
  exerciseName,
  dateLabel,
  cell,
  cellClass,
  tooltip,
  isDragSource,
  suppressOpen,
  onSelectExercise,
  onOpenEditor,
  onDragPointerDown,
  initialRepsPattern,
}: WorkoutGridFilledCellProps) {
  const queuePointerDrag = (event: MouseEvent | TouchEvent) => {
    event.stopPropagation();
    const point = "touches" in event ? event.touches[0] : event;
    if (!point) {
      return;
    }
    onDragPointerDown?.(point.clientX, point.clientY);
  };

  const openEditor = () => {
    if (suppressOpen) {
      return;
    }
    onSelectExercise(exerciseId);
    onOpenEditor({
      mode: "edit",
      exerciseId,
      date,
      exerciseName,
      dateLabel,
      weightKg: cell.weightKg,
      repsPattern: initialRepsPattern,
      cell,
    });
  };

  const cellClasses = [
    cellClass,
    isDragSource ? "workout-grid__cell--drag-source" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <td
      className={cellClasses}
      data-workout-grid-drop
      data-exercise-id={exerciseId}
      data-date={date}
      data-empty="false"
    >
      <div className="workout-grid__cell-inner">
        <button
          type="button"
          className="workout-grid__cell-btn"
          title={`${tooltip} · drag to move · click to edit`}
          onMouseDown={queuePointerDrag}
          onTouchStart={queuePointerDrag}
          onClick={openEditor}
        >
          {cell.display}
        </button>
      </div>
    </td>
  );
}

export type WorkoutGridEmptyCellProps = {
  exerciseId: string;
  date: string;
  exerciseName: string;
  dateLabel: string;
  suppressOpen?: boolean;
  onSelectExercise: (exerciseId: string) => void;
  onOpenEditor: (session: WorkoutGridCellEditorSession) => void;
  defaultWeightKg: number;
  defaultRepsPattern: string;
};

export function WorkoutGridEmptyCell({
  exerciseId,
  date,
  exerciseName,
  dateLabel,
  suppressOpen,
  onSelectExercise,
  onOpenEditor,
  defaultWeightKg,
  defaultRepsPattern,
}: WorkoutGridEmptyCellProps) {
  const openEditor = () => {
    if (suppressOpen) {
      return;
    }
    onSelectExercise(exerciseId);
    onOpenEditor({
      mode: "add",
      exerciseId,
      date,
      exerciseName,
      dateLabel,
      weightKg: defaultWeightKg,
      repsPattern: defaultRepsPattern,
    });
  };

  return (
    <td
      className="workout-grid__cell workout-grid__cell--empty"
      data-workout-grid-drop
      data-exercise-id={exerciseId}
      data-date={date}
      data-empty="true"
    >
      <button
        type="button"
        className="workout-grid__cell-empty-btn"
        title="Click to add session"
        onClick={openEditor}
      />
    </td>
  );
}
