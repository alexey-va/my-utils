import { memo, useEffect, useMemo, useRef, type CSSProperties } from "react";
import { PlusOutlined } from "@ant-design/icons";
import { Spin } from "antd";
import type { WorkoutCell, WorkoutGrid, WorkoutGridRow } from "../../api/types";
import WorkoutSparkline from "./WorkoutSparkline";
import type { WorkoutCellTarget } from "./types";
import { useMatrixCellNavigation } from "./useMatrixCellNavigation";
import type { CompareSeries } from "./workoutAnalytics";
import {
  cellVolume,
  formatCellTooltip,
  formatSignedDelta,
  heatmapLevel,
  previousSessionCell,
  rowVolumeRange,
  rowWeightSeries,
  rowWeightTrend,
  todayIso,
} from "./workoutAnalytics";
import { chartColorForIndex } from "./workoutChartColors";

const PROGRESS_WEEKS = 12;

function formatColumnDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function formatColumnWeekday(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

function dateColStripeClass(colIndex: number): string {
  return colIndex % 2 === 0
    ? "workout-matrix__date-col--stripe-a"
    : "workout-matrix__date-col--stripe-b";
}

const EXERCISE_COL_WIDTH = 216;
const DATE_COL_WIDTH = 125;

function matrixTableWidth(dateCount: number): number {
  return EXERCISE_COL_WIDTH + dateCount * DATE_COL_WIDTH;
}

type Props = {
  grid: WorkoutGrid;
  loading: boolean;
  filterQuery?: string;
  primaryExerciseId?: string;
  chartExerciseIds: string[];
  chartSeries: CompareSeries[];
  activeCell?: WorkoutCellTarget;
  activeExerciseId?: string;
  onExerciseRowClick: (exerciseId: string, multi: boolean) => void;
  onPrimarySelect: (exerciseId: string) => void;
  onCellSelect: (target: WorkoutCellTarget) => void;
  onExerciseSelect: (exerciseId: string, exerciseName: string) => void;
  onAddExercise: () => void;
  onPrefetchExercise?: (exerciseId: string) => void;
};

function isSameCell(a: WorkoutCellTarget | undefined, exerciseId: string, date: string): boolean {
  return a?.exerciseId === exerciseId && a?.date === date;
}

function WorkoutMatrixTable({
  grid,
  loading,
  filterQuery = "",
  primaryExerciseId,
  chartExerciseIds,
  chartSeries,
  activeCell,
  activeExerciseId,
  onExerciseRowClick,
  onPrimarySelect,
  onCellSelect,
  onExerciseSelect,
  onAddExercise,
  onPrefetchExercise,
}: Props) {
  const colorById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of chartSeries) {
      map.set(s.exerciseId, s.color);
    }
    return map;
  }, [chartSeries]);
  const viewportRef = useRef<HTMLDivElement>(null);
  const today = todayIso();

  const displayDates = useMemo(() => [...grid.dates].reverse(), [grid.dates]);
  const tableWidth = matrixTableWidth(displayDates.length);

  const visibleRows = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) {
      return grid.rows;
    }
    return grid.rows.filter((row) => row.exerciseName.toLowerCase().includes(q));
  }, [grid.rows, filterQuery]);

  const { isFocused, onKeyDown } = useMatrixCellNavigation({
    rows: visibleRows,
    dates: displayDates,
    activeCell,
    onSelectCell: (target) => {
      const row = visibleRows.find((r) => r.exerciseId === target.exerciseId);
      onPrimarySelect(target.exerciseId);
      onCellSelect({
        ...target,
        cell: target.cell ?? row?.cells[target.date],
      });
    },
  });

  const matrixStyle = useMemo(
    () => ({ "--matrix-width": `${tableWidth}px` }) as CSSProperties,
    [tableWidth],
  );

  const clampHorizontalScroll = () => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    const maxLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    if (viewport.scrollLeft > maxLeft) {
      viewport.scrollLeft = maxLeft;
    }
  };

  const scrollToToday = () => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    const colIndex = displayDates.indexOf(today);
    if (colIndex < 0) {
      return;
    }
    const targetLeft =
      EXERCISE_COL_WIDTH +
      colIndex * DATE_COL_WIDTH -
      viewport.clientWidth / 2 +
      DATE_COL_WIDTH / 2;
    viewport.scrollLeft = Math.max(0, Math.min(targetLeft, viewport.scrollWidth - viewport.clientWidth));
  };

  useEffect(() => {
    if (loading) {
      return;
    }
    scrollToToday();
    clampHorizontalScroll();
  }, [displayDates, grid.rows.length, loading, today]);

  useEffect(() => {
    clampHorizontalScroll();
  }, [tableWidth, displayDates.length, grid.rows.length, loading]);

  const openCell = (row: WorkoutGridRow, date: string, cell: WorkoutCell | undefined) => {
    onPrimarySelect(row.exerciseId);
    onCellSelect({ exerciseId: row.exerciseId, date, cell });
  };

  return (
    <div className="workout-matrix" style={matrixStyle}>
      <div
        ref={viewportRef}
        className="workout-matrix__viewport"
        tabIndex={0}
        role="grid"
        aria-label="Workout log table"
        onScroll={clampHorizontalScroll}
        onKeyDown={onKeyDown}
      >
        {loading ? (
          <div className="workout-matrix__overlay" aria-busy="true">
            <Spin />
          </div>
        ) : null}
        <div className="workout-matrix__clip">
          {grid.rows.length === 0 && !loading ? (
            <p className="workout-matrix__empty">No exercises yet — add one below.</p>
          ) : visibleRows.length === 0 ? (
            <p className="workout-matrix__empty">No exercises match your search.</p>
          ) : (
            <table className="workout-matrix__grid">
              <colgroup>
                <col className="workout-matrix__exercise-col" />
                {displayDates.map((date) => (
                  <col key={date} className="workout-matrix__date-col" />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th className="workout-matrix__exercise-col">Exercise</th>
                  {displayDates.map((date, colIndex) => (
                    <th
                      key={date}
                      className={[
                        "workout-matrix__date-col",
                        dateColStripeClass(colIndex),
                        date === today ? "workout-matrix__date-col--today" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <span className="workout-matrix__date-label">
                        <span className="workout-matrix__date-primary">
                          {formatColumnDate(date)}
                        </span>
                        <span className="workout-matrix__date-weekday">
                          {formatColumnWeekday(date)}
                        </span>
                        {date === today ? (
                          <span className="workout-matrix__today-tag">today</span>
                        ) : null}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => {
                  const isPrimary = row.exerciseId === primaryExerciseId;
                  const chartIndex = chartExerciseIds.indexOf(row.exerciseId);
                  const onChart = chartIndex >= 0;
                  const chartColor =
                    colorById.get(row.exerciseId) ??
                    (onChart ? chartColorForIndex(chartIndex) : undefined);
                  const trend = rowWeightTrend(row, grid.dates, PROGRESS_WEEKS);
                  const volRange = rowVolumeRange(row);

                  return (
                    <tr
                      key={row.exerciseId}
                      className={[
                        isPrimary ? "workout-matrix__row--primary" : "",
                        onChart ? "workout-matrix__row--chart" : "",
                      ]
                        .filter(Boolean)
                        .join(" ") || undefined}
                    >
                      <td
                        className={[
                          "workout-matrix__exercise-col",
                          row.exerciseId === activeExerciseId
                            ? "workout-matrix__exercise-col--active"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        style={
                          onChart && chartColor
                            ? ({ "--row-chart-color": chartColor } as CSSProperties)
                            : undefined
                        }
                        onMouseEnter={() => onPrefetchExercise?.(row.exerciseId)}
                        onClick={(e) => {
                          onExerciseRowClick(row.exerciseId, e.metaKey || e.ctrlKey);
                          onExerciseSelect(row.exerciseId, row.exerciseName);
                        }}
                      >
                        <span className="workout-matrix__exercise-cell">
                          <span className="workout-matrix__exercise-text">
                            <span className="workout-matrix__exercise-name" title={row.exerciseName}>
                              {row.exerciseName}
                            </span>
                            {trend ? (
                              <span
                                className={`workout-matrix__row-trend${trend.deltaKg > 0 ? " workout-matrix__row-trend--up" : ""}`}
                                title={`${PROGRESS_WEEKS} week weight trend`}
                              >
                                {trend.percent != null
                                  ? `${trend.percent > 0 ? "+" : ""}${Math.round(trend.percent)}%`
                                  : formatSignedDelta(trend.deltaKg, "kg")}
                                <span className="workout-matrix__row-trend-period">
                                  {" "}
                                  · {PROGRESS_WEEKS}w
                                </span>
                              </span>
                            ) : null}
                          </span>
                          <WorkoutSparkline
                            values={rowWeightSeries(row, grid.dates)}
                            color={chartColor}
                          />
                        </span>
                      </td>
                      {displayDates.map((date, colIndex) => {
                        const cell = row.cells[date];
                        const active = isSameCell(activeCell, row.exerciseId, date);
                        const focused = isFocused(row.exerciseId, date);
                        const tooltip = cell
                          ? formatCellTooltip(cell, previousSessionCell(row, grid.dates, date))
                          : undefined;
                        const heatLevel =
                          cell && volRange.max > 0
                            ? heatmapLevel(cellVolume(cell), volRange.min, volRange.max)
                            : 0;

                        return (
                          <td
                            key={date}
                            className={[
                              "workout-matrix__date-col",
                              dateColStripeClass(colIndex),
                              date === today ? "workout-matrix__date-col--today" : "",
                              cell?.display ? "workout-matrix__date-col--filled" : "workout-matrix__date-col--empty",
                              active ? "workout-matrix__cell--active" : "",
                              focused ? "workout-matrix__cell--focused" : "",
                              heatLevel > 0 ? `workout-matrix__cell--heat-${heatLevel}` : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            tabIndex={-1}
                            onClick={() => openCell(row, date, cell)}
                          >
                            {cell?.display ? (
                              <span className="workout-matrix__cell" title={tooltip}>
                                {cell.display}
                              </span>
                            ) : (
                              <span className="workout-matrix__cell--empty" aria-hidden />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <button type="button" className="workout-matrix__add-zone" onClick={onAddExercise}>
        <PlusOutlined className="workout-matrix__add-zone-icon" aria-hidden />
        <span>Add new exercise</span>
      </button>
    </div>
  );
}

export default memo(WorkoutMatrixTable);
