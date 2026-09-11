import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NetworkAuditActivity from "./NetworkAuditActivity";
import { buildAuditActivity } from "./auditActivity";
import type { NetworkAuditEvent } from "./types";

const events: NetworkAuditEvent[] = [
  request("one", "2026-09-11T10:00:00.000Z", "exec.run"),
  request("two", "2026-09-11T10:04:00.000Z", "file.read"),
  request("three", "2026-09-11T10:06:00.000Z", "exec.run"),
  { ...request("result", "2026-09-11T10:07:00.000Z", "exec.run"), kind: "job.succeeded" },
  { ...request("invalid", "not-a-date", "workflow.online") },
];

describe("NetworkAuditActivity", () => {
  it("counts queued requests once and builds ordered action and time histograms", () => {
    const activity = buildAuditActivity(events);

    expect(activity.total).toBe(3);
    expect(activity.actions).toEqual([
      { action: "exec.run", count: 2 },
      { action: "file.read", count: 1 },
    ]);
    expect(activity.buckets.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(3);
    expect(activity.buckets.some((bucket) => bucket.count === 0)).toBe(true);
  });

  it("renders both histograms and states when the sample is truncated", () => {
    render(<NetworkAuditActivity events={events} loading={false} error={null} hasMore />);

    const panel = screen.getByTestId("network-audit-activity");
    expect(within(panel).getByText("Частота запросов")).toBeInTheDocument();
    expect(within(panel).getByText("3", { selector: "strong" })).toBeInTheDocument();
    expect(within(panel).getByText("2", { selector: ".network-audit-action-chart strong" })).toBeInTheDocument();
    expect(within(panel).getByRole("img", { name: "Частота 3 запросов по времени" })).toBeInTheDocument();
    expect(within(panel).getByRole("list", { name: "Частота запросов по действиям" })).toBeInTheDocument();
    expect(within(panel).getByText(/Последние 3\+ запросов/)).toBeInTheDocument();
  });

  it("keeps the time histogram bounded for a very sparse long-lived audit", () => {
    const activity = buildAuditActivity([
      request("old", "2020-01-01T00:00:00.000Z", "exec.run"),
      request("new", "2026-09-11T10:00:00.000Z", "exec.run"),
    ]);

    expect(activity.buckets.length).toBeLessThanOrEqual(14);
    expect(activity.buckets.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(2);
  });
});

function request(id: string, timestamp: string, action: string): NetworkAuditEvent {
  return {
    id,
    timestamp,
    kind: "job.queued",
    actor: { id: "mcp:test", name: "MCP", source: "mcp" },
    node_id: "gercena",
    action,
    job_id: `job-${id}`,
    state: "queued",
  };
}
