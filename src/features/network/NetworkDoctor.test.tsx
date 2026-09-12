import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import NetworkDoctor from "./NetworkDoctor";
import type { NetworkDoctorReport, NetworkNode } from "./types";

const node: NetworkNode = {
  id: "node-1",
  name: "velocity-prod",
  os: "linux",
  arch: "amd64",
  hostname: "velocity.example",
  version: "1.3.0",
  last_seen: "2026-09-11T09:58:00.000Z",
  roots: [],
  runtimes: [],
  actions: [],
  labels: {},
  disabled: false,
  diagnostics: {
    build: { revision: "node-revision", go_version: "go1.24.0", executable_sha256: "a".repeat(64), workflow_sha256: "b".repeat(64) },
    config_sha256: "c".repeat(64),
    workflow_sha256: "d".repeat(64),
  },
};

const legacyNode: NetworkNode = { ...node, id: "node-legacy", name: "legacy", diagnostics: null };

const report: NetworkDoctorReport = {
  checked_at: "2026-09-11T10:00:00.000Z",
  protocol: "1.4.0",
  gateway: { revision: "gateway-revision", go_version: "go1.24.0", executable_sha256: "e".repeat(64), workflow_sha256: "f".repeat(64) },
  nodes: [
    { node, issues: [{ code: "revision_mismatch", severity: "warning", message: "different revision" }, { code: "protocol_mismatch", severity: "error", message: "protocol mismatch" }, { code: "stale", severity: "warning", message: "stale" }] },
    { node: legacyNode, issues: [{ code: "offline", severity: "error", message: "offline" }, { code: "diagnostics_unavailable", severity: "warning", message: "legacy" }] },
  ],
  issues: [{ code: "gateway_build_unverified", severity: "warning", message: "unverified" }],
};

describe("NetworkDoctor", () => {
  afterEach(cleanup);

  it("shows revisions, expandable fingerprints, legacy diagnostics and mapped health issues", () => {
    const panel = render(<NetworkDoctor report={report} loading={false} error={null} onRefresh={vi.fn()} />).container;

    expect(within(panel).getByText("gateway-revision")).toBeInTheDocument();
    expect(within(panel).getByText("node-revision")).toBeInTheDocument();
    expect(within(panel).getByText("a".repeat(64))).toBeInTheDocument();
    expect(within(panel).getByText("c".repeat(64))).toBeInTheDocument();
    expect(within(panel).getByText("Диагностика недоступна у старого агента")).toBeInTheDocument();
    expect(within(panel).getByText("Heartbeat узла устарел: старше 45 секунд")).toBeInTheDocument();
    expect(within(panel).getByText("Узел офлайн: heartbeat не было более 2 минут")).toBeInTheDocument();
    expect(within(panel).getByText("Версия протокола узла не совпадает с gateway")).toBeInTheDocument();
    expect(within(panel).getByText("Ревизия исходников узла отличается от gateway")).toBeInTheDocument();
    expect(within(panel).queryByText("Явных проблем не обнаружено")).not.toBeInTheDocument();
    expect(panel.querySelectorAll("details")).toHaveLength(6);
    expect(within(panel).getAllByRole("button", { name: "Copy to clipboard" })).toHaveLength(6);
  }, 15000);

  it("keeps the previous report visible while a refresh is loading or fails", () => {
    const { rerender } = render(<NetworkDoctor report={report} loading error={null} onRefresh={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent("Обновляем диагностику…");

    rerender(<NetworkDoctor report={report} loading={false} error="gateway unavailable" onRefresh={vi.fn()} />);
    expect(screen.getByText("gateway unavailable")).toBeInTheDocument();
    expect(screen.getByText("gateway-revision")).toBeInTheDocument();
  });
});
