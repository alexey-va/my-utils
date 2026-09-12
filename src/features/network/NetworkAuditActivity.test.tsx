import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import NetworkAuditActivity from "./NetworkAuditActivity";
import type { NetworkActivity, NetworkActivitySummary } from "./types";

const summary: NetworkActivitySummary = {
  requests: 3,
  succeeded: 1,
  failed: 1,
  cancelled: 0,
  unknown: 0,
  pending: 1,
  queue_ms: { samples: 2, mean_ms: 12, p95_ms: 20 },
  execution_ms: { samples: 1, mean_ms: 240, p95_ms: 240 },
  transfer_bytes: 2_048,
  transfer_samples: 1,
  transfer_unknown: 1,
};

const activity: NetworkActivity = {
  window: "24h",
  from: "2026-09-11T00:00:00.000Z",
  to: "2026-09-12T00:00:00.000Z",
  bucket_seconds: 1_800,
  basis: "job_created_at",
  coverage: { retained_jobs: 12, archived_in_window: 2, oldest_job_at: "2026-08-01T00:00:00.000Z" },
  totals: summary,
  buckets: [
    { ...summary, requests: 2, start: "2026-09-11T00:00:00.000Z", end: "2026-09-11T00:30:00.000Z" },
    { ...summary, requests: 0, succeeded: 0, failed: 0, pending: 0, start: "2026-09-11T00:30:00.000Z", end: "2026-09-11T01:00:00.000Z" },
    { ...summary, requests: 1, succeeded: 0, failed: 1, pending: 0, start: "2026-09-11T01:00:00.000Z", end: "2026-09-11T01:30:00.000Z" },
  ],
  actions: [
    { ...summary, action: "exec.run", requests: 2 },
    { ...summary, action: "file.read", requests: 1 },
  ],
};

describe("NetworkAuditActivity", () => {
  afterEach(cleanup);

  it("renders exact summaries, per-action counts, and zero buckets", () => {
    const panel = render(<NetworkAuditActivity activity={activity} loading={false} error={null} window="24h" onWindowChange={vi.fn()} />).container;

    expect(within(panel).getByText("Активность заданий")).toBeInTheDocument();
    expect(within(panel).getByText("2.0 КиБ")).toBeInTheDocument();
    expect(within(panel).getByText(/ср\. 12 мс · p95 20 мс/)).toBeInTheDocument();
    expect(within(panel).getByText(/Сохранено заданий: 12/)).toBeInTheDocument();
    expect(within(panel).getByRole("img", { name: "Частота 3 запросов по времени" })).toBeInTheDocument();
    expect(within(panel).getAllByRole("listitem")).toHaveLength(2);
    expect(within(panel).getByText("exec.run", { selector: ".network-audit-action-chart code" })).toBeInTheDocument();
    expect(within(panel).getByText("file.read", { selector: ".network-audit-action-chart code" })).toBeInTheDocument();
    expect(panel.querySelectorAll(".network-audit-time-chart__bucket")).toHaveLength(3);
    expect(panel.querySelectorAll(".network-audit-time-chart__bucket")[1]).toHaveAttribute("title", expect.stringContaining("0 запросов"));
  }, 15000);

  it("keeps the date in 7-day bucket labels", () => {
    const sevenDayActivity: NetworkActivity = {
      ...activity,
      window: "7d",
      bucket_seconds: 10_800,
      buckets: [{ ...activity.buckets[0], start: "2026-09-11T00:00:00.000Z", end: "2026-09-11T03:00:00.000Z" }],
    };
    const panel = render(<NetworkAuditActivity activity={sevenDayActivity} loading={false} error={null} window="7d" onWindowChange={vi.fn()} />).container;

    expect(panel.querySelector(".network-audit-time-chart__bucket")).toHaveAttribute("title", expect.stringMatching(/11 сент\., \d{2}:\d{2}/));
  }, 15000);

  it("shows loading and activity errors without falling back to audit samples", () => {
    const { rerender } = render(<NetworkAuditActivity activity={null} loading error={null} window="1h" onWindowChange={vi.fn()} />);
    expect(screen.getByTestId("network-audit-activity").querySelector(".network-audit-activity__loading")).toBeInTheDocument();

    rerender(<NetworkAuditActivity activity={null} loading={false} error="gateway unavailable" window="1h" onWindowChange={vi.fn()} />);
    expect(screen.getByText("gateway unavailable")).toBeInTheDocument();
    expect(screen.queryByText(/Частота/)).not.toBeInTheDocument();
  });
});
