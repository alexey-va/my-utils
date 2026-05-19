import type { ProgressPoint, WorkoutCell, WorkoutGrid, WorkoutGridRow } from "../../api/types";

export type ProgressPeriod = "all" | "4" | "8" | "12";

export function periodToWeeks(period: ProgressPeriod): number | null {
  if (period === "all") {
    return null;
  }
  return Number(period);
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
  thisWeekSessions: number;
  lastWeekSessions: number;
  thisWeekVolume: number;
  lastWeekVolume: number;
};

export function cellVolume(cell: WorkoutCell): number {
  return cell.weightKg * cell.setCount * cell.repsPerSet;
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

export function formatSignedDelta(value: number, unit: string, decimals = 1): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)} ${unit}`;
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

  let thisWeekSessions = 0;
  let lastWeekSessions = 0;
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
        thisWeekSessions += 1;
        thisWeekVolume += vol;
      } else if (key === lastKey) {
        lastWeekSessions += 1;
        lastWeekVolume += vol;
      }
    }
  }

  return { thisWeekSessions, lastWeekSessions, thisWeekVolume, lastWeekVolume };
}

/** Weight series in column order for mini sparkline. */
export function rowWeightSeries(row: WorkoutGridRow, dates: string[]): number[] {
  return dates
    .map((date) => row.cells[date]?.weightKg ?? 0)
    .filter((w) => w > 0);
}
