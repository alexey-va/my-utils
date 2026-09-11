import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NetworkPage from "./NetworkPage";
import { nodeStatus } from "./utils";
import type { NetworkAction, NetworkJob, NetworkNode } from "./types";

const api = vi.hoisted(() => ({
  cancelJob: vi.fn(),
  createCredential: vi.fn(),
  enrollNode: vi.fn(),
  fetchActions: vi.fn(),
  fetchCredentials: vi.fn(),
  fetchJob: vi.fn(),
  fetchJobs: vi.fn(),
  fetchNodes: vi.fn(),
  revokeCredential: vi.fn(),
  setNodeDisabled: vi.fn(),
  submitJob: vi.fn(),
}));

vi.mock("./api", () => ({
  cancelNetworkJob: api.cancelJob,
  createNetworkCredential: api.createCredential,
  enrollNetworkNode: api.enrollNode,
  fetchNetworkActions: api.fetchActions,
  fetchNetworkCredentials: api.fetchCredentials,
  fetchNetworkJob: api.fetchJob,
  fetchNetworkJobs: api.fetchJobs,
  fetchNetworkNodes: api.fetchNodes,
  revokeNetworkCredential: api.revokeCredential,
  setNetworkNodeDisabled: api.setNodeDisabled,
  submitNetworkJob: api.submitJob,
}));

const node: NetworkNode = {
  id: "node-1",
  name: "velocity-prod",
  os: "linux",
  arch: "amd64",
  hostname: "velocity.example",
  version: "1.4.0",
  last_seen: "2026-09-11T09:59:30.000Z",
  roots: ["/srv/velocity"],
  runtimes: ["java-21"],
  actions: ["health.check", "service.restart"],
  labels: { env: "prod" },
  disabled: false,
};

const readAction: NetworkAction = {
  name: "health.check",
  description: "Проверить доступность сервисов",
  mutating: false,
  scope: "read",
};

const mutatingAction: NetworkAction = {
  name: "service.restart",
  description: "Перезапустить сервис",
  mutating: true,
  scope: "control",
};

const job: NetworkJob = {
  id: "job-1",
  request: {
    node_id: node.id,
    action: readAction.name,
    args: {},
    idempotency_key: "old-key",
    timeout_seconds: 60,
  },
  principal: "admin",
  state: "queued",
  created_at: "2026-09-11T09:59:00.000Z",
  cancel_requested: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  api.fetchNodes.mockResolvedValue({ nodes: [node] });
  api.fetchActions.mockResolvedValue({ actions: [readAction, mutatingAction] });
  api.fetchJobs.mockResolvedValue({ jobs: [] });
  api.fetchCredentials.mockResolvedValue({ credentials: [] });
  api.fetchJob.mockResolvedValue(job);
  api.submitJob.mockResolvedValue(job);
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
  vi.restoreAllMocks();
});

async function waitForLoadedPage() {
  await waitFor(() => expect(screen.getByTestId("network-submit")).toBeInTheDocument());
}

describe("NetworkPage", () => {
  it("classifies heartbeat and disabled nodes at the 90 second boundary", () => {
    const now = Date.parse("2026-09-11T10:00:00.000Z");
    expect(nodeStatus(node, now)).toBe("online");
    expect(nodeStatus({ ...node, last_seen: "2026-09-11T09:58:30.000Z" }, now)).toBe("offline");
    expect(nodeStatus({ ...node, disabled: true }, now)).toBe("disabled");
  });

  it("refreshes node heartbeats before a fresh last_seen can age past 90 seconds", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(Date.parse("2026-09-11T10:00:00.000Z"));
    api.fetchNodes.mockImplementation(async () => ({ nodes: [{ ...node, last_seen: new Date().toISOString() }] }));

    render(<NetworkPage />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getAllByText("Онлайн").length).toBeGreaterThan(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(95_000);
    });

    expect(api.fetchNodes.mock.calls.length).toBeGreaterThanOrEqual(4);
    expect(screen.getAllByText("Онлайн").length).toBeGreaterThan(0);
  }, 15000);

  it("submits a read action with a Web Crypto idempotency key", async () => {
    render(<NetworkPage />);

    await waitForLoadedPage();
    fireEvent.click(screen.getByTestId("network-submit"));

    await waitFor(() => expect(api.submitJob).toHaveBeenCalledTimes(1));
    const request = api.submitJob.mock.calls[0][0] as NetworkJob["request"];
    expect(request).toMatchObject({ node_id: node.id, action: readAction.name, args: {} });
    expect(request.idempotency_key).toMatch(/^[0-9a-f-]{36}$/);
    expect(request.timeout_seconds).toBe(60);
  });

  it("keeps the same idempotency key for a manual retry after a failed request", async () => {
    api.submitJob.mockRejectedValueOnce(new Error("temporary network failure")).mockResolvedValueOnce(job);
    render(<NetworkPage />);

    await waitForLoadedPage();
    fireEvent.click(screen.getByTestId("network-submit"));
    await waitFor(() => expect(api.submitJob).toHaveBeenCalledTimes(1));
    const retry = await screen.findByTestId("network-retry");
    const firstRequest = api.submitJob.mock.calls[0][0] as NetworkJob["request"];

    fireEvent.click(retry);
    await waitFor(() => expect(api.submitJob).toHaveBeenCalledTimes(2));
    const secondRequest = api.submitJob.mock.calls[1][0] as NetworkJob["request"];
    expect(secondRequest.idempotency_key).toBe(firstRequest.idempotency_key);
    expect(screen.queryByTestId("network-retry")).not.toBeInTheDocument();
  });

  it("enrolls a new node id even when the gateway has no registered nodes", async () => {
    const token = "one-time-enrollment-token";
    api.fetchNodes.mockResolvedValueOnce({ nodes: [] });
    api.fetchActions.mockResolvedValueOnce({ actions: [] });
    api.enrollNode.mockResolvedValue({ name: "velocity-prod", node_id: "velocity-prod-01", token, expires_at: "2026-09-11T10:10:00Z" });

    render(<NetworkPage />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Подключить узел" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Подключить узел" }));
    fireEvent.change(await screen.findByPlaceholderText("например, velocity-prod"), { target: { value: "velocity-prod" } });
    fireEvent.change(screen.getByPlaceholderText("например, velocity-prod-01"), { target: { value: "velocity-prod-01" } });
    fireEvent.click(screen.getByTestId("network-enrollment-submit"));

    await waitFor(() => expect(api.enrollNode).toHaveBeenCalledWith({ name: "velocity-prod", node_id: "velocity-prod-01" }));
    expect(screen.getByText(token)).toBeInTheDocument();
    const secretModal = screen.getByText("Секрет показывается один раз").closest(".ant-modal");
    expect(secretModal).not.toBeNull();
    expect(within(secretModal as HTMLElement).getByText(/rcnet enroll --config/)).not.toHaveTextContent(token);
  }, 15000);

  it("refreshes an open job detail when the queue reports a new state", async () => {
    const succeededJob: NetworkJob = {
      ...job,
      state: "succeeded",
      completed_at: "2026-09-11T10:00:03.000Z",
      result: { ok: true, stdout: "gateway ok", exit_code: 0 },
    };
    api.fetchJobs
      .mockResolvedValueOnce({ jobs: [job] })
      .mockResolvedValueOnce({ jobs: [succeededJob] });
    api.fetchJob.mockResolvedValueOnce(job).mockResolvedValueOnce(succeededJob);

    render(<NetworkPage />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Открыть" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Открыть" }));
    await waitFor(() => expect(api.fetchJob).toHaveBeenCalledTimes(1));
    expect(screen.getAllByText("В очереди").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByTestId("network-refresh"));
    await waitFor(() => expect(api.fetchJob).toHaveBeenCalledTimes(2));
    expect((await screen.findAllByText("Успешно")).length).toBeGreaterThan(0);
    expect(screen.getByText("gateway ok")).toBeInTheDocument();
  }, 15000);

  it("requires confirmation for mutating actions and keeps a credential token out of listings and storage", async () => {
    const token = "credential-secret-token";
    api.createCredential.mockResolvedValue({ credential: { id: "cred-1", name: "deploy-bot", nodes: [node.id], scopes: ["read"], disabled: false, created_at: "2026-09-11T10:00:00Z" }, token });
    render(<NetworkPage />);

    await waitForLoadedPage();
    fireEvent.click(screen.getByRole("button", { name: /service\.restart/ }));
    await waitFor(() => expect(screen.getByTestId("network-submit")).toHaveTextContent("Подтвердить и выполнить"));
    fireEvent.click(screen.getByTestId("network-submit"));
    expect(await screen.findByText("Подтвердить mutating action?")).toBeInTheDocument();
    expect(api.submitJob).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Отмена" }));

    fireEvent.click(screen.getByTestId("network-create-credential"));
    fireEvent.change(await screen.findByPlaceholderText("например, deploy-bot"), { target: { value: "deploy-bot" } });
    fireEvent.click(screen.getByTestId("network-credential-submit"));

    await waitFor(() => expect(api.createCredential).toHaveBeenCalledTimes(1));
    expect(screen.getByText(token)).toBeInTheDocument();
    expect(screen.queryByText(token, { selector: ".network-credential *" })).not.toBeInTheDocument();
    expect(localStorage.getItem(token)).toBeNull();
    expect(localStorage.getItem("RCNet_GATEWAY_TOKEN")).toBeNull();

    const secretModal = screen.getByText("Секрет показывается один раз").closest(".ant-modal");
    expect(secretModal).not.toBeNull();
    expect(within(secretModal as HTMLElement).getByText(token)).toBeInTheDocument();
    expect(within(secretModal as HTMLElement).getByText(/RCNET_URL=https:\/\/utils\.alexeyav\.ru\/api\/network/)).not.toHaveTextContent(token);
  }, 15000);
});
