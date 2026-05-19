import type { WorkoutGrid } from "../../api/types";

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportWorkoutGridCsv(grid: WorkoutGrid): void {
  const header = ["Exercise", ...grid.dates.map((d) => d)];
  const lines = [
    header.map(escapeCsv).join(","),
    ...grid.rows.map((row) =>
      [row.exerciseName, ...grid.dates.map((d) => row.cells[d]?.display ?? "")]
        .map(escapeCsv)
        .join(","),
    ),
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `workout-log-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
