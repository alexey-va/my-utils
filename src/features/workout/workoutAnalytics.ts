import type {
  Exercise,
  ProgressMetric,
  ProgressPoint,
  WorkoutCell,
  WorkoutGrid,
  WorkoutGridRow,
} from "../../api/types";
import { cellVolume as cellVolumeFromReps } from "./workoutSetReps";
import {
  MUSCLE_GROUP_LABELS,
  type MuscleGroup,
  normalizeMuscleGroup,
} from "./workoutMuscleGroups";

/** Non-numeric values — avoids Segmented thumb mis-measure with "4"/"8"/"12". */
export type ProgressPeriod = "all" | "p4" | "p8" | "p12";

const PERIOD_WEEKS: Record<Exclude<ProgressPeriod, "all">, number> = {
  p4: 4,
  p8: 8,
  p12: 12,
};

export function periodToWeeks(period: ProgressPeriod): number | null {
  if (period === "all") {
    return null;
  }
  return PERIOD_WEEKS[period];
}

export type CellRecordFlags = {
  isPrWeight: boolean;
  isPrVolume: boolean;
};

export type RowRecords = {
  maxWeight: number;
  maxVolume: number;
  byDate: Map<string, CellRecordFlags>;
};

export type ProgressTrends = {
  lastWeight: number | null;
  weightVsPrevious: number | null;
  weightVsWeeksAgo: number | null;
  weeksAgoLabel: number | null;
  lastVolume: number | null;
  volumeVsPrevious: number | null;
};

export type WeeklySummary = {
  /** Calendar days this week with at least one logged set (any exercise). */
  thisWeekDays: number;
  lastWeekDays: number;
  thisWeekVolume: number;
  lastWeekVolume: number;
};

export function cellVolume(cell: WorkoutCell): number {
  return cellVolumeFromReps(cell.weightKg, cell);
}

export function computeRowRecords(row: WorkoutGridRow): RowRecords {
  let maxWeight = 0;
  let maxVolume = 0;
  const byDate = new Map<string, CellRecordFlags>();

  for (const cell of Object.values(row.cells)) {
    if (!cell) {
      continue;
    }
    maxWeight = Math.max(maxWeight, cell.weightKg);
    maxVolume = Math.max(maxVolume, cellVolume(cell));
  }

  for (const [date, cell] of Object.entries(row.cells)) {
    if (!cell) {
      continue;
    }
    const vol = cellVolume(cell);
    byDate.set(date, {
      isPrWeight: cell.weightKg > 0 && cell.weightKg >= maxWeight,
      isPrVolume: vol > 0 && vol >= maxVolume,
    });
  }

  return { maxWeight, maxVolume, byDate };
}

export function heatmapLevel(value: number, min: number, max: number): number {
  if (max <= min || value <= 0) {
    return 0;
  }
  const t = (value - min) / (max - min);
  return Math.min(5, Math.max(1, Math.ceil(t * 5)));
}

export function rowVolumeRange(row: WorkoutGridRow): { min: number; max: number } {
  let min = Infinity;
  let max = 0;
  for (const cell of Object.values(row.cells)) {
    if (!cell) {
      continue;
    }
    const v = cellVolume(cell);
    min = Math.min(min, v);
    max = Math.max(max, v);
  }
  if (!Number.isFinite(min)) {
    return { min: 0, max: 0 };
  }
  return { min, max };
}

export function filterPointsByPeriod(points: ProgressPoint[], period: ProgressPeriod): ProgressPoint[] {
  const weeks = periodToWeeks(period);
  if (weeks == null || points.length === 0) {
    return points;
  }
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - weeks * 7);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  return points.filter((p) => p.date >= cutoffIso);
}

export function computeProgressTrends(
  points: ProgressPoint[],
  weeksAgo = 4,
): ProgressTrends {
  if (points.length === 0) {
    return {
      lastWeight: null,
      weightVsPrevious: null,
      weightVsWeeksAgo: null,
      weeksAgoLabel: null,
      lastVolume: null,
      volumeVsPrevious: null,
    };
  }

  const last = points[points.length - 1];
  const prev = points.length > 1 ? points[points.length - 2] : null;

  const cutoff = new Date(`${last.date}T12:00:00`);
  cutoff.setDate(cutoff.getDate() - weeksAgo * 7);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  const baseline = points.find((p) => p.date >= cutoffIso) ?? points[0];

  return {
    lastWeight: last.weightKg,
    weightVsPrevious: prev != null ? last.weightKg - prev.weightKg : null,
    weightVsWeeksAgo: baseline ? last.weightKg - baseline.weightKg : null,
    weeksAgoLabel: weeksAgo,
    lastVolume: last.volume,
    volumeVsPrevious: prev != null ? last.volume - prev.volume : null,
  };
}

function formatDeltaNumber(value: number, decimals?: number): string {
  if (decimals !== undefined) {
    return value.toFixed(decimals);
  }
  if (Number.isInteger(value) || Math.abs(value - Math.round(value)) < 1e-6) {
    return String(Math.round(value));
  }
  return value.toFixed(1);
}

export function formatSignedDelta(value: number, unit: string, decimals?: number): string {
  const sign = value > 0 ? "+" : "";
  const suffix = unit ? ` ${unit}` : "";
  return `${sign}${formatDeltaNumber(value, decimals)}${suffix}`;
}

export function formatPercentDelta(value: number, base: number): string | null {
  if (base === 0) {
    return null;
  }
  const pct = (value / base) * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(0)}%`;
}

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function weekKey(iso: string): string {
  return startOfWeek(new Date(`${iso}T12:00:00`)).toISOString().slice(0, 10);
}

export function computeWeeklySummary(grid: WorkoutGrid): WeeklySummary {
  const now = new Date();
  const thisKey = weekKey(now.toISOString().slice(0, 10));
  const lastWeek = startOfWeek(now);
  lastWeek.setDate(lastWeek.getDate() - 7);
  const lastKey = weekKey(lastWeek.toISOString().slice(0, 10));

  const thisWeekDates = new Set<string>();
  const lastWeekDates = new Set<string>();
  let thisWeekVolume = 0;
  let lastWeekVolume = 0;

  for (const row of grid.rows) {
    for (const [date, cell] of Object.entries(row.cells)) {
      if (!cell) {
        continue;
      }
      const key = weekKey(date);
      const vol = cellVolume(cell);
      if (key === thisKey) {
        thisWeekDates.add(date);
        thisWeekVolume += vol;
      } else if (key === lastKey) {
        lastWeekDates.add(date);
        lastWeekVolume += vol;
      }
    }
  }

  return {
    thisWeekDays: thisWeekDates.size,
    lastWeekDays: lastWeekDates.size,
    thisWeekVolume,
    lastWeekVolume,
  };
}

/** Weight series in chronological order for mini sparkline. */
export function rowWeightSeries(row: WorkoutGridRow, dates: string[]): number[] {
  return [...dates]
    .sort()
    .map((date) => row.cells[date]?.weightKg ?? 0)
    .filter((w) => w > 0);
}

/** Most recent logged session for a row (any column order). */
export function lastSessionForRow(
  row: WorkoutGridRow,
  dates: string[],
): WorkoutCell | undefined {
  let latest: { date: string; cell: WorkoutCell } | undefined;
  for (const date of dates) {
    const cell = row.cells[date];
    if (cell && (!latest || date > latest.date)) {
      latest = { date, cell };
    }
  }
  return latest?.cell;
}

/** Previous session before `currentDate` on the same row. */
export function previousSessionCell(
  row: WorkoutGridRow,
  dates: string[],
  currentDate: string,
): WorkoutCell | undefined {
  let previous: { date: string; cell: WorkoutCell } | undefined;
  for (const date of dates) {
    const cell = row.cells[date];
    if (cell && date < currentDate && (!previous || date > previous.date)) {
      previous = { date, cell };
    }
  }
  return previous?.cell;
}

export function formatCellTooltip(
  cell: WorkoutCell,
  prev: WorkoutCell | undefined,
): string {
  const lines = [
    `${cell.weightKg} kg · ${cell.setCount}×${cell.repsPerSet} · max ${cell.maxReps}`,
    `Volume ${cellVolume(cell)} kg`,
  ];
  if (prev) {
    const dw = cell.weightKg - prev.weightKg;
    const dv = cellVolume(cell) - cellVolume(prev);
    lines.push(
      `vs prev: ${formatSignedDelta(dw, "kg")}, volume ${formatSignedDelta(dv, "kg")}`,
    );
  }
  return lines.join("\n");
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Epley formula — reps = max reps on last set. */
export function estimateE1rm(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) {
    return 0;
  }
  if (reps === 1) {
    return weightKg;
  }
  return Math.round(weightKg * (1 + reps / 30));
}

export function bestE1rmFromPoints(points: ProgressPoint[]): number | null {
  let best = 0;
  for (const p of points) {
    best = Math.max(best, estimateE1rm(p.weightKg, p.maxReps));
  }
  return best > 0 ? best : null;
}

export type RowWeightTrend = {
  deltaKg: number;
  percent: number | null;
  weeks: number;
};

/** Weight change from first session within N weeks to latest session. */
export function rowWeightTrend(
  row: WorkoutGridRow,
  dates: string[],
  weeks = 12,
): RowWeightTrend | null {
  const chronological = [...dates].sort();
  const latestDate = chronological.filter((d) => row.cells[d]).at(-1);
  if (!latestDate) {
    return null;
  }
  const latest = row.cells[latestDate];
  if (!latest) {
    return null;
  }

  const cutoff = new Date(`${latestDate}T12:00:00`);
  cutoff.setDate(cutoff.getDate() - weeks * 7);
  const cutoffIso = cutoff.toISOString().slice(0, 10);

  let baseline: WorkoutCell | undefined;
  for (const date of chronological) {
    if (date < cutoffIso) {
      continue;
    }
    const cell = row.cells[date];
    if (cell) {
      baseline = cell;
      break;
    }
  }
  if (!baseline || baseline === latest) {
    return null;
  }

  const deltaKg = latest.weightKg - baseline.weightKg;
  return {
    deltaKg,
    percent: formatPercentDelta(deltaKg, baseline.weightKg) != null
      ? (deltaKg / baseline.weightKg) * 100
      : null,
    weeks,
  };
}

export type MuscleGroupVolume = {
  group: MuscleGroup;
  label: string;
  volume: number;
};

export function computeMuscleGroupVolumeThisWeek(
  grid: WorkoutGrid,
  exercises: Exercise[],
): MuscleGroupVolume[] {
  const groupByExerciseId = new Map(
    exercises.map((e) => [e.id, normalizeMuscleGroup(e.muscleGroup)]),
  );
  const now = new Date();
  const thisKey = weekKey(now.toISOString().slice(0, 10));

  const totals = new Map<MuscleGroup, number>();
  for (const g of Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[]) {
    totals.set(g, 0);
  }

  for (const row of grid.rows) {
    const group = groupByExerciseId.get(row.exerciseId) ?? "other";
    for (const [date, cell] of Object.entries(row.cells)) {
      if (!cell || weekKey(date) !== thisKey) {
        continue;
      }
      totals.set(group, (totals.get(group) ?? 0) + cellVolume(cell));
    }
  }

  return (Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[])
    .map((group) => ({
      group,
      label: MUSCLE_GROUP_LABELS[group],
      volume: totals.get(group) ?? 0,
    }))
    .filter((item) => item.volume > 0)
    .sort((a, b) => b.volume - a.volume);
}

export type CompareSeries = {
  exerciseId: string;
  name: string;
  points: ProgressPoint[];
  color: string;
};

export type CompareChartRow = {
  date: string;
  label: string;
  [metricKey: string]: string | number | null;
};

export function metricValue(point: ProgressPoint, metric: ProgressMetric): number {
  switch (metric) {
    case "weight":
      return point.weightKg;
    case "maxReps":
      return point.maxReps;
    case "volume":
      return point.volume;
  }
}

/** Merged rows for Recharts — one key per exercise (`s_<id>`). */
export function buildCompareChartData(
  series: CompareSeries[],
  period: ProgressPeriod,
  metric: ProgressMetric,
): CompareChartRow[] {
  if (series.length === 0) {
    return [];
  }

  const dateSet = new Set<string>();
  for (const s of series) {
    for (const p of filterPointsByPeriod(s.points, period)) {
      dateSet.add(p.date);
    }
  }

  const dates = [...dateSet].sort();

  return dates.map((date) => {
    const row: CompareChartRow = {
      date,
      label: new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
      }),
    };
    for (const s of series) {
      const filtered = filterPointsByPeriod(s.points, period);
      const point = filtered.find((p) => p.date === date);
      row[`s_${s.exerciseId}`] = point != null ? metricValue(point, metric) : null;
    }
    return row;
  });
}

export type CompareTooltipEntry = {
  exerciseId: string;
  name: string;
  color: string;
  value: number | null;
  /** True when showing last value before this date (no session on hovered date). */
  carried: boolean;
};

export function compareTooltipEntries(
  series: CompareSeries[],
  targetDate: string,
  period: ProgressPeriod,
  metric: ProgressMetric,
): CompareTooltipEntry[] {
  return series.map((s) => {
    const points = filterPointsByPeriod(s.points, period).sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    let exact: number | null = null;
    let lastAtOrBefore: number | null = null;

    for (const p of points) {
      const v = metricValue(p, metric);
      if (p.date === targetDate) {
        exact = v;
      }
      if (p.date <= targetDate) {
        lastAtOrBefore = v;
      }
    }

    if (exact != null) {
      return {
        exerciseId: s.exerciseId,
        name: s.name,
        color: s.color,
        value: exact,
        carried: false,
      };
    }
    if (lastAtOrBefore != null) {
      return {
        exerciseId: s.exerciseId,
        name: s.name,
        color: s.color,
        value: lastAtOrBefore,
        carried: true,
      };
    }
    return {
      exerciseId: s.exerciseId,
      name: s.name,
      color: s.color,
      value: null,
      carried: false,
    };
  });
}

export function formatMetricValue(value: number, metric: ProgressMetric): string {
  switch (metric) {
    case "weight":
      return `${value} kg`;
    case "maxReps":
      return String(value);
    case "volume":
      return `${value} kg`;
  }
}
