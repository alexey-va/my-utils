import { useEffect, useState } from "react";
import { Input, InputNumber, message, Tooltip } from "antd";
import type { WorkoutCell } from "../../api/types";
import { upsertRequestFromCell } from "./workoutEntryPayload";
import { repsPatternFromCell } from "./workoutSetReps";
import {
  decodeDragPayload,
  encodeDragPayload,
  WORKOUT_CELL_DRAG_MIME,
  type WorkoutGridDragPayload,
} from "./workoutGridDnD";

type Props = {
  exerciseId: string;
  date: string;
  cell: WorkoutCell;
  cellClass: string;
  tooltip: string;
  saving: boolean;
  dropHighlight: boolean;
  onSelectExercise: (exerciseId: string) => void;
  onMove: (from: WorkoutGridDragPayload, toExerciseId: string, toDate: string) => Promise<void>;
  onUpdate: (payload: ReturnType<typeof upsertRequestFromCell>) => Promise<void>;
  onDragBegin?: () => void;
};

export default function WorkoutGridCell({
  exerciseId,
  date,
  cell,
  cellClass,
  tooltip,
  saving,
  dropHighlight,
  onSelectExercise,
  onMove,
  onUpdate,
  onDragBegin,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [weightKg, setWeightKg] = useState(cell.weightKg);
  const [repsPattern, setRepsPattern] = useState(repsPatternFromCell(cell));

  useEffect(() => {
    if (!editing) {
      setWeightKg(cell.weightKg);
      setRepsPattern(repsPatternFromCell(cell));
    }
  }, [cell, editing]);

  const cancelEdit = () => {
    setWeightKg(cell.weightKg);
    setRepsPattern(repsPatternFromCell(cell));
    setEditing(false);
  };

  const saveEdit = async () => {
    try {
      const payload = upsertRequestFromCell(exerciseId, date, cell, {
        weightKg,
        repsPattern,
      });
      await onUpdate(payload);
      setEditing(false);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Invalid value");
    }
  };

  const handleDragStart = (event: React.DragEvent) => {
    if (editing || saving) {
      event.preventDefault();
      return;
    }
    const payload: WorkoutGridDragPayload = { exerciseId, fromDate: date };
    event.dataTransfer.setData(WORKOUT_CELL_DRAG_MIME, encodeDragPayload(payload));
    event.dataTransfer.effectAllowed = "move";
    onDragBegin?.();
  };

  const handleDragOver = (event: React.DragEvent) => {
    if (saving) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    const raw = event.dataTransfer.getData(WORKOUT_CELL_DRAG_MIME);
    const from = decodeDragPayload(raw);
    if (!from) {
      return;
    }
    await onMove(from, exerciseId, date);
  };

  if (editing) {
    return (
      <td
        className={`${cellClass} workout-grid__cell--editing`}
        onDragOver={handleDragOver}
        onDrop={(e) => void handleDrop(e)}
      >
        <div className="workout-grid__cell-edit">
          <InputNumber
            className="workout-grid__cell-edit-weight"
            autoFocus
            min={1}
            step={1}
            precision={0}
            size="small"
            value={weightKg}
            disabled={saving}
            onChange={(value) => setWeightKg(Math.max(1, Math.round(value ?? 1)))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void saveEdit();
              }
              if (e.key === "Escape") {
                cancelEdit();
              }
            }}
          />
          <Input
            className="workout-grid__cell-edit-reps"
            size="small"
            value={repsPattern}
            disabled={saving}
            onChange={(e) => setRepsPattern(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void saveEdit();
              }
              if (e.key === "Escape") {
                cancelEdit();
              }
            }}
          />
          <div className="workout-grid__cell-edit-actions">
            <button
              type="button"
              className="workout-grid__cell-edit-save"
              disabled={saving}
              onClick={() => void saveEdit()}
            >
              Save
            </button>
            <button
              type="button"
              className="workout-grid__cell-edit-cancel"
              disabled={saving}
              onClick={cancelEdit}
            >
              Cancel
            </button>
          </div>
        </div>
      </td>
    );
  }

  return (
    <td
      className={`${cellClass}${dropHighlight ? " workout-grid__cell--drop-target" : ""}`}
      onDragOver={handleDragOver}
      onDrop={(e) => void handleDrop(e)}
    >
      <Tooltip title={`${tooltip} · drag to move · click to edit`} placement="top">
        <button
          type="button"
          className="workout-grid__cell-btn"
          draggable={!saving}
          disabled={saving}
          onDragStart={handleDragStart}
          onClick={() => {
            onSelectExercise(exerciseId);
            setEditing(true);
          }}
        >
          {cell.display}
        </button>
      </Tooltip>
    </td>
  );
}

type EmptyProps = {
  exerciseId: string;
  date: string;
  saving: boolean;
  dropHighlight: boolean;
  onMove: (from: WorkoutGridDragPayload, toExerciseId: string, toDate: string) => Promise<void>;
};

export function WorkoutGridEmptyCell({
  exerciseId,
  date,
  saving,
  dropHighlight,
  onMove,
}: EmptyProps) {
  const handleDragOver = (event: React.DragEvent) => {
    if (saving) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    const raw = event.dataTransfer.getData(WORKOUT_CELL_DRAG_MIME);
    const from = decodeDragPayload(raw);
    if (!from) {
      return;
    }
    await onMove(from, exerciseId, date);
  };

  return (
    <td
      className={
        dropHighlight
          ? "workout-grid__cell workout-grid__cell--empty workout-grid__cell--drop-target"
          : "workout-grid__cell workout-grid__cell--empty"
      }
      onDragOver={handleDragOver}
      onDrop={(e) => void handleDrop(e)}
    />
  );
}
