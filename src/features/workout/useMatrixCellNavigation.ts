import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from "react";
import type { WorkoutGridRow } from "../../api/types";
import type { WorkoutCellTarget } from "./types";

type CellCoord = { exerciseId: string; date: string };

type Options = {
  rows: WorkoutGridRow[];
  dates: string[];
  activeCell?: WorkoutCellTarget;
  onSelectCell: (target: WorkoutCellTarget) => void;
  enabled?: boolean;
};

export function useMatrixCellNavigation({
  rows,
  dates,
  activeCell,
  onSelectCell,
  enabled = true,
}: Options) {
  const cells = useMemo(() => {
    const list: CellCoord[] = [];
    for (const row of rows) {
      for (const date of dates) {
        list.push({ exerciseId: row.exerciseId, date });
      }
    }
    return list;
  }, [rows, dates]);

  const [focusIndex, setFocusIndex] = useState(0);

  useEffect(() => {
    if (!activeCell) {
      return;
    }
    const idx = cells.findIndex(
      (c) => c.exerciseId === activeCell.exerciseId && c.date === activeCell.date,
    );
    if (idx >= 0) {
      setFocusIndex(idx);
    }
  }, [activeCell, cells]);

  const focusCell = cells[focusIndex] ?? cells[0];

  const selectAt = useCallback(
    (index: number) => {
      const cell = cells[index];
      if (!cell) {
        return;
      }
      const row = rows.find((r) => r.exerciseId === cell.exerciseId);
      onSelectCell({
        exerciseId: cell.exerciseId,
        date: cell.date,
        cell: row?.cells[cell.date],
      });
      setFocusIndex(index);
    },
    [cells, onSelectCell, rows],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled || cells.length === 0) {
        return;
      }
      if (event.key === "Tab") {
        event.preventDefault();
        const next = event.shiftKey
          ? (focusIndex - 1 + cells.length) % cells.length
          : (focusIndex + 1) % cells.length;
        selectAt(next);
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        selectAt(focusIndex);
      }
    },
    [cells.length, enabled, focusIndex, selectAt],
  );

  const isFocused = useCallback(
    (exerciseId: string, date: string) =>
      focusCell?.exerciseId === exerciseId && focusCell?.date === date,
    [focusCell],
  );

  return { focusIndex, isFocused, onKeyDown };
}
