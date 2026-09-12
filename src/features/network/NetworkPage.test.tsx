import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NetworkPage from "./NetworkPage";
import { nodeStatus } from "./utils";
import type { NetworkAction, NetworkActivity, NetworkAuditEvent, NetworkDoctorReport, NetworkJob, NetworkNode, NetworkJobProgress } from "./types";

const api = vi.hoisted(() => ({
  cancelJob: vi.fn(),
  createCredential: vi.fn(),
  enrollNode: vi.fn(),
  fetchActions: vi.fn(),
  fetchAudit: vi.fn(),
  fetchActivity: vi.fn(),
  fetchCredentials: vi.fn(),
  fetchDoctor: vi.fn(),
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
  fetchNetworkAudit: api.fetchAudit,
  fetchNetworkActivity: api.fetchActivity,
  fetchNetworkCredentials: api.fetchCredentials,
  fetchNetworkDoctor: api.fetchDoctor,
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

const workflowPlanAction: NetworkAction = {
  name: "workflow.plan",
  description: "Проверить план деплоя на узле",
  mutating: false,
  scope: "read",
};
const workflowReconcileAction = "workflow.reconcile";

const mutatingAction: NetworkAction = {
  name: "service.restart",
  description: "Перезапустить сервис",
  mutating: true,
  scope: "control",
};

const runtimeAction: NetworkAction = {
  name: "runtime.status",
  description: "Проверить runtime",
  mutating: false,
  scope: "read",
};

const fileAction: NetworkAction = {
  name: "file.list",
  description: "Список файлов",
  mutating: false,
  scope: "read",
};

const limitedNode: NetworkNode = {
  ...node,
  id: "node-2",
  name: "backend-prod",
  hostname: "backend.example",
  roots: ["/srv/backend"],
  runtimes: ["python-3.12"],
  actions: [runtimeAction.name, fileAction.name],
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

const activity: NetworkActivity = {
  window: "24h",
  from: "2026-09-11T00:00:00.000Z",
  to: "2026-09-12T00:00:00.000Z",
  bucket_seconds: 1_800,
  basis: "job_created_at",
  coverage: { retained_jobs: 4, archived_in_window: 1, oldest_job_at: "2026-09-10T00:00:00.000Z" },
  totals: {
    requests: 2,
    succeeded: 1,
    failed: 0,
    cancelled: 0,
    unknown: 0,
    pending: 1,
    queue_ms: { samples: 1, mean_ms: 12, p95_ms: 12 },
    execution_ms: { samples: 1, mean_ms: 240, p95_ms: 240 },
    transfer_bytes: 1_024,
    transfer_samples: 1,
    transfer_unknown: 0,
  },
  buckets: [
    { start: "2026-09-11T00:00:00.000Z", end: "2026-09-11T00:30:00.000Z", requests: 2, succeeded: 1, failed: 0, cancelled: 0, unknown: 0, pending: 1, queue_ms: { samples: 1, mean_ms: 12, p95_ms: 12 }, execution_ms: { samples: 1, mean_ms: 240, p95_ms: 240 }, transfer_bytes: 1_024, transfer_samples: 1, transfer_unknown: 0 },
    { start: "2026-09-11T00:30:00.000Z", end: "2026-09-11T01:00:00.000Z", requests: 0, succeeded: 0, failed: 0, cancelled: 0, unknown: 0, pending: 0, queue_ms: { samples: 0 }, execution_ms: { samples: 0 }, transfer_bytes: 0, transfer_samples: 0, transfer_unknown: 0 },
  ],
  actions: [{ action: "health.check", requests: 2, succeeded: 1, failed: 0, cancelled: 0, unknown: 0, pending: 1, queue_ms: { samples: 1, mean_ms: 12, p95_ms: 12 }, execution_ms: { samples: 1, mean_ms: 240, p95_ms: 240 }, transfer_bytes: 1_024, transfer_samples: 1, transfer_unknown: 0 }],
};

const doctorReport: NetworkDoctorReport = {
  checked_at: "2026-09-11T10:00:00.000Z",
  protocol: "1.4.0",
  gateway: { revision: "abc123", go_version: "go1.24.0", executable_sha256: "a".repeat(64), workflow_sha256: "b".repeat(64) },
  nodes: [{ node, issues: [] }],
  issues: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  api.fetchNodes.mockResolvedValue({ nodes: [node] });
  api.fetchActions.mockResolvedValue({ actions: [readAction, mutatingAction, runtimeAction, fileAction] });
  api.fetchAudit.mockResolvedValue({ events: [] });
  api.fetchActivity.mockResolvedValue(activity);
  api.fetchJobs.mockResolvedValue({ jobs: [] });
  api.fetchCredentials.mockResolvedValue({ credentials: [] });
  api.fetchDoctor.mockResolvedValue(doctorReport);
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

  it("limits actions to the selected node and rebuilds samples for its roots and runtimes", async () => {
    api.fetchNodes.mockResolvedValue({ nodes: [node, limitedNode] });
    render(<NetworkPage />);

    await waitForLoadedPage();
    expect(screen.getByText("health.check", { selector: ".network-action code" })).toBeInTheDocument();
    fireEvent.click(screen.getByText("backend-prod", { selector: ".network-node strong" }));

    await waitFor(() => {
      expect(screen.queryByText("health.check", { selector: ".network-action code" })).not.toBeInTheDocument();
      expect(screen.getByText("runtime.status", { selector: ".network-action code" })).toBeInTheDocument();
    });
    expect(screen.getByLabelText("JSON arguments")).toHaveValue(JSON.stringify({ runtime: "python-3.12" }, null, 2));

    fireEvent.click(screen.getByText("file.list", { selector: ".network-action code" }));
    expect(screen.getByLabelText("JSON arguments")).toHaveValue(JSON.stringify({ root: "/srv/backend", path: "." }, null, 2));
  });

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

  it("does not replace an opened job when a submitted job resolves later", async () => {
    const submitted = deferred<NetworkJob>();
    const submittedJob: NetworkJob = { ...job, id: "job-submitted", result: { ok: true, stdout: "stale submit result" } };
    api.fetchJobs.mockResolvedValue({ jobs: [job] });
    api.fetchJob.mockResolvedValue({ ...job, result: { ok: true, stdout: "opened job result" } });
    api.submitJob.mockReturnValue(submitted.promise);

    render(<NetworkPage />);

    await waitForLoadedPage();
    fireEvent.click(screen.getByTestId("network-submit"));
    await waitFor(() => expect(api.submitJob).toHaveBeenCalledTimes(1));
    fireEvent.click(await screen.findByRole("button", { name: "Открыть" }));
    expect(await screen.findByText("opened job result")).toBeInTheDocument();

    await act(async () => {
      submitted.resolve(submittedJob);
      await submitted.promise;
    });
    expect(screen.getByText("opened job result")).toBeInTheDocument();
    expect(screen.queryByText("stale submit result")).not.toBeInTheDocument();
  }, 15000);

  it("keeps an uncertain submit retry key after switching drawers", async () => {
    const submitted = deferred<NetworkJob>();
    const retryResponse = deferred<NetworkJob>();
    const secondJob: NetworkJob = { ...job, id: "job-second", request: { ...job.request, idempotency_key: "second-key" }, result: { ok: true, stdout: "opened second job" } };
    api.fetchJobs.mockResolvedValue({ jobs: [job, secondJob] });
    api.fetchJob.mockImplementation((jobID: string) => Promise.resolve(jobID === secondJob.id ? secondJob : job));
    api.submitJob.mockReturnValueOnce(submitted.promise).mockReturnValueOnce(retryResponse.promise);

    render(<NetworkPage />);

    await waitForLoadedPage();
    fireEvent.click(screen.getByTestId("network-submit"));
    await waitFor(() => expect(api.submitJob).toHaveBeenCalledTimes(1));
    fireEvent.click((await screen.findAllByRole("button", { name: "Открыть" }))[1]);
    expect(await screen.findByText("opened second job")).toBeInTheDocument();

    await act(async () => {
      submitted.reject(new Error("response lost after server acceptance"));
      await submitted.promise.catch(() => undefined);
    });
    const retry = await screen.findByTestId("network-retry");
    expect(screen.getByText("opened second job")).toBeInTheDocument();

    fireEvent.click(retry);
    await waitFor(() => expect(api.submitJob).toHaveBeenCalledTimes(2));
    const originalRequest = api.submitJob.mock.calls[0][0] as NetworkJob["request"];
    const retryRequest = api.submitJob.mock.calls[1][0] as NetworkJob["request"];
    expect(retryRequest).toMatchObject({ action: originalRequest.action, args: originalRequest.args });
    expect(retryRequest.idempotency_key).toBe(originalRequest.idempotency_key);
    expect(screen.getByText("opened second job")).toBeInTheDocument();
  }, 15000);

  it("uses a long default timeout for workflow actions and submits 1800 without truncation", async () => {
    api.fetchNodes.mockResolvedValue({ nodes: [{ ...node, actions: [workflowPlanAction.name, readAction.name] }] });
    api.fetchActions.mockResolvedValue({ actions: [workflowPlanAction, readAction] });
    api.submitJob.mockResolvedValue({ ...job, request: { ...job.request, action: workflowPlanAction.name, timeout_seconds: 1_800 } });

    render(<NetworkPage />);

    await waitForLoadedPage();
    expect(screen.getByRole("spinbutton")).toHaveValue(1_800);
    fireEvent.click(screen.getByText(readAction.name, { selector: ".network-action code" }));
    expect(screen.getByRole("spinbutton")).toHaveValue(60);
    fireEvent.click(screen.getByText(workflowPlanAction.name, { selector: ".network-action code" }));
    expect(screen.getByRole("spinbutton")).toHaveValue(1_800);
    fireEvent.click(screen.getByTestId("network-submit"));

    await waitFor(() => expect(api.submitJob).toHaveBeenCalledTimes(1));
    expect((api.submitJob.mock.calls[0][0] as NetworkJob["request"]).timeout_seconds).toBe(1_800);
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
    let currentJobs = [job];
    api.fetchJobs.mockImplementation(() => Promise.resolve({ jobs: currentJobs }));
    api.fetchJob.mockResolvedValueOnce(job).mockResolvedValueOnce(succeededJob);

    render(<NetworkPage />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Открыть" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Открыть" }));
    await waitFor(() => expect(api.fetchJob).toHaveBeenCalledTimes(1));
    expect(screen.getAllByText("В очереди").length).toBeGreaterThan(0);

    currentJobs = [succeededJob];
    fireEvent.click(screen.getByTestId("network-refresh"));
    await waitFor(() => expect(api.fetchJob).toHaveBeenCalledTimes(2));
    expect((await screen.findAllByText("Успешно")).length).toBeGreaterThan(0);
    expect(screen.getByText("gateway ok")).toBeInTheDocument();
  }, 15000);

  it("keeps the newest job drawer when detail responses finish out of order", async () => {
    const firstJob = { ...job, id: "job-first" };
    const secondJob = { ...job, id: "job-second", request: { ...job.request, idempotency_key: "second-key" } };
    const firstDetail = deferred<NetworkJob>();
    const secondDetail = deferred<NetworkJob>();
    api.fetchJobs.mockResolvedValue({ jobs: [firstJob, secondJob] });
    api.fetchJob.mockImplementation((jobID: string) => jobID === firstJob.id ? firstDetail.promise : secondDetail.promise);

    render(<NetworkPage />);

    const openButtons = await screen.findAllByRole("button", { name: "Открыть" });
    fireEvent.click(openButtons[0]);
    await waitFor(() => expect(api.fetchJob).toHaveBeenCalledWith(firstJob.id));
    fireEvent.click(openButtons[1]);
    await waitFor(() => expect(api.fetchJob).toHaveBeenCalledWith(secondJob.id));

    await act(async () => {
      secondDetail.resolve({ ...secondJob, result: { ok: true, stdout: "newest detail" } });
      await secondDetail.promise;
    });
    expect(screen.getByText(secondJob.id)).toBeInTheDocument();
    expect(screen.getByText("newest detail")).toBeInTheDocument();

    await act(async () => {
      firstDetail.resolve({ ...firstJob, result: { ok: true, stdout: "stale detail" } });
      await firstDetail.promise;
    });
    expect(screen.getByText(secondJob.id)).toBeInTheDocument();
    expect(screen.queryByText(firstJob.id)).not.toBeInTheDocument();
    expect(screen.queryByText("stale detail")).not.toBeInTheDocument();
  }, 15000);

  it("does not treat a successful workflow job as delivery or activation proof", async () => {
    const operationID = "a".repeat(64);
    const operationJob: NetworkJob = {
      ...job,
      id: operationID,
      state: "succeeded",
      request: { ...job.request, action: "workflow.deploy", args: { runtimes: ["velocity"] }, timeout_seconds: 1_800 },
      result: {
        ok: true,
        data: {
          operation_id: operationID,
          delivery: "unknown",
          activation: "unknown",
          files: [{ runtime: "velocity", path: "plugins/example.jar", expected_sha256: "a".repeat(64), actual_sha256: "b".repeat(64), status: "changed" }],
          next_steps: ["inspect_operation_evidence"],
        },
      },
    };
    api.fetchJobs.mockResolvedValue({ jobs: [operationJob] });
    api.fetchJob.mockResolvedValue(operationJob);

    render(<NetworkPage />);

    await waitForLoadedPage();
    fireEvent.click(await screen.findByRole("button", { name: "Открыть" }));
    expect(await screen.findByTestId("network-workflow-evidence")).toBeInTheDocument();
    expect(within(screen.getByTestId("network-workflow-evidence")).getAllByText(operationID).length).toBeGreaterThan(0);
    expect(screen.getByTestId("network-workflow-unconfirmed")).toHaveTextContent("не подтверждает доставку или активацию");
    expect(screen.getByText("Хэш не совпадает")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Сверить результат/ })).toBeInTheDocument();
  }, 15000);

  it("keeps another drawer selected while a workflow reconciliation is queued", async () => {
    const operationID = "c".repeat(64);
    const operationJob: NetworkJob = {
      ...job,
      id: operationID,
      state: "failed",
      request: { ...job.request, action: "workflow.restart", args: { runtimes: ["velocity"] }, timeout_seconds: 1_800 },
      result: { ok: false, error: "operation interrupted", data: { operation_id: operationID, delivery: "unknown", activation: "unknown" } },
    };
    const secondJob: NetworkJob = { ...job, id: "job-second", request: { ...job.request, idempotency_key: "second-key" }, state: "succeeded", result: { ok: true, stdout: "second detail" } };
    const reconcileJob: NetworkJob = {
      ...job,
      id: "d".repeat(64),
      state: "queued",
      request: { ...job.request, action: workflowReconcileAction, args: { operation_id: operationID } },
    };
    const reconcile = deferred<NetworkJob>();
    api.fetchJobs.mockResolvedValue({ jobs: [operationJob, secondJob] });
    api.fetchJob.mockImplementation((jobID: string) => Promise.resolve(jobID === operationID ? operationJob : secondJob));
    api.submitJob.mockReturnValue(reconcile.promise);

    render(<NetworkPage />);

    await waitForLoadedPage();
    const openButtons = await screen.findAllByRole("button", { name: "Открыть" });
    fireEvent.click(openButtons[0]);
    await waitFor(() => expect(api.fetchJob).toHaveBeenCalledWith(operationID));
    await screen.findByTestId("network-workflow-evidence");
    await screen.findByRole("button", { name: /Сверить результат/ });
    fireEvent.click(screen.getByRole("button", { name: /Сверить результат/ }));
    await waitFor(() => expect(api.submitJob).toHaveBeenCalledTimes(1));
    expect(api.submitJob.mock.calls[0][0]).toMatchObject({
      node_id: node.id,
      action: workflowReconcileAction,
      args: { operation_id: operationID },
      timeout_seconds: 60,
    });
    expect(api.submitJob.mock.calls[0][0].idempotency_key).toMatch(/^[0-9a-f-]{36}$/);

    fireEvent.click(openButtons[1]);
    await waitFor(() => expect(screen.getByText(secondJob.id)).toBeInTheDocument());
    await act(async () => {
      reconcile.resolve(reconcileJob);
      await reconcile.promise;
    });
    expect(screen.getByText(secondJob.id)).toBeInTheDocument();
    expect(screen.queryByText(reconcileJob.id)).not.toBeInTheDocument();
  }, 15000);

  it("does not reopen the job drawer when a closed detail request resolves", async () => {
    const detail = deferred<NetworkJob>();
    api.fetchJobs.mockResolvedValue({ jobs: [job] });
    api.fetchJob.mockReturnValue(detail.promise);

    render(<NetworkPage />);

    await waitForLoadedPage();
    fireEvent.click(await screen.findByRole("button", { name: "Открыть" }));
    await waitFor(() => expect(api.fetchJob).toHaveBeenCalledWith(job.id));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByText(job.id)).not.toBeInTheDocument();

    await act(async () => {
      detail.resolve({ ...job, result: { ok: true, stdout: "closed detail" } });
      await detail.promise;
    });
    expect(screen.queryByText(job.id)).not.toBeInTheDocument();
    expect(screen.queryByText("closed detail")).not.toBeInTheDocument();
  }, 30000);

  it("shows current workflow progress and caps a long detail timeline", async () => {
    const events: NetworkJobProgress[] = Array.from({ length: 53 }, (_, index) => ({
      sequence: index + 1,
      at: `2026-09-11T10:00:${String(index).padStart(2, "0")}.000Z`,
      phase: `phase-${index + 1}`,
      status: index === 52 ? "waiting" : ["ok", "ready", "planned", "delivered", "joined"][index % 5],
      target: index === 52 ? "proxyarc" : undefined,
      message: index === 52 ? "Ожидается heartbeat агента" : undefined,
    }));
    const detail: NetworkJob = {
      ...job,
      state: "running",
      progress: events[52],
      events: [null, "malformed", ...events] as unknown as NetworkJobProgress[],
    };
    api.fetchJobs.mockResolvedValue({ jobs: [{ ...job, state: "running", progress: events[52] }] });
    api.fetchJob.mockResolvedValue(detail);

    render(<NetworkPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Открыть" }, { timeout: 15_000 }));
    const progress = await screen.findByTestId("network-job-progress");

    expect(progress.querySelector(".network-job-progress__current")).toHaveTextContent("phase-53");
    expect(progress.querySelector(".network-job-progress__current")).toHaveTextContent("Ожидается heartbeat агента");
    expect(within(progress).getByText("Этапы")).toBeInTheDocument();
    expect(within(progress).getByText("Показаны последние 50 из 53")).toBeInTheDocument();
    expect(progress.querySelector(".network-job-progress__current")).toHaveTextContent("Сервер: proxyarc");
    expect(within(progress).getAllByText("ok", { selector: ".ant-tag" })[0]).toHaveClass("ant-tag-success");
    expect(within(progress).getAllByText("waiting", { selector: ".ant-tag" })[0]).toHaveClass("ant-tag-processing");
    expect(within(progress).getAllByRole("listitem")).toHaveLength(50);
    expect(within(progress).queryByText("phase-1")).not.toBeInTheDocument();
    expect(within(progress).getAllByText("phase-53")).toHaveLength(2);
  }, 15000);

  it("keeps the old gateway detail layout when progress fields are absent", async () => {
    api.fetchJobs.mockResolvedValue({ jobs: [{ ...job, state: "succeeded" }] });
    api.fetchJob.mockResolvedValue({ ...job, state: "succeeded", result: { ok: true, stdout: "legacy gateway" } });

    render(<NetworkPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Открыть" }));
    expect(await screen.findByText("legacy gateway")).toBeInTheDocument();
    expect(screen.queryByTestId("network-job-progress")).not.toBeInTheDocument();
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

  it("shows a filtered audit event with safe parameters and opens its job detail", async () => {
    api.fetchAudit.mockResolvedValue({
      events: [{
        id: "audit-1",
        timestamp: "2026-09-11T10:00:03.000Z",
        kind: "job.succeeded",
        actor: { id: "web:user-17", name: "Alexey", source: "web" },
        node_id: node.id,
        action: "exec.run",
        job_id: job.id,
        state: "succeeded",
        parameters: { root: "/srv/velocity", executable: "uptime", cwd: "/srv/velocity", job_id: "job-1", phase: "restart", status: "waiting", target: "proxyarc", argv: "must-not-render" },
        message: "Команда завершена",
        exit_code: 0,
      }],
      next_cursor: "audit-cursor-2",
    });
    api.fetchJob.mockResolvedValue({ ...job, state: "succeeded", result: { ok: true, stdout: "up 1 day", exit_code: 0 } });

    render(<NetworkPage />);
    await waitForLoadedPage();
    fireEvent.click(screen.getByRole("tab", { name: "Журнал" }));
    const auditPanel = await screen.findByTestId("network-audit");

    await waitFor(() => expect(within(auditPanel).getByText("Команда завершена")).toBeInTheDocument());
    expect(api.fetchAudit).toHaveBeenCalledWith({ limit: 50 });
    expect(within(auditPanel).getByText("Alexey")).toBeInTheDocument();
    expect(within(auditPanel).getByText("web:user-17")).toBeInTheDocument();
    expect(within(auditPanel).getByText(/root=\/srv\/velocity/)).toBeInTheDocument();
    expect(within(auditPanel).getByText(/executable=uptime/)).toBeInTheDocument();
    expect(within(auditPanel).getByText(/cwd=\/srv\/velocity/)).toBeInTheDocument();
    expect(within(auditPanel).getByText(/job_id=job-1/)).toBeInTheDocument();
    expect(within(auditPanel).getByText(/phase=restart/)).toBeInTheDocument();
    expect(within(auditPanel).getByText(/status=waiting/)).toBeInTheDocument();
    expect(within(auditPanel).getByText(/target=proxyarc/)).toBeInTheDocument();
    expect(within(auditPanel).queryByText("must-not-render")).not.toBeInTheDocument();

    fireEvent.click(within(auditPanel).getByRole("button", { name: "Открыть job" }));
    await waitFor(() => expect(api.fetchJob).toHaveBeenCalledWith(job.id));
    expect(screen.getByText("up 1 day")).toBeInTheDocument();
  }, 15000);

  it("loads exact activity metrics independently of the journal kind", async () => {
    api.fetchActivity.mockResolvedValue({ ...activity, totals: { ...activity.totals, requests: 3 }, actions: [
      { ...activity.actions[0], action: "exec.run", requests: 2 },
      { ...activity.actions[0], action: "file.read", requests: 1 },
    ] });

    render(<NetworkPage />);
    await waitForLoadedPage();
    fireEvent.click(screen.getByRole("tab", { name: "Журнал" }));

    const activityPanel = await screen.findByTestId("network-audit-activity");
    await waitFor(() => expect(api.fetchActivity).toHaveBeenCalledWith({ window: "24h" }));
    expect(within(activityPanel).getByText("3", { selector: ".network-activity-metric strong" })).toBeInTheDocument();
    expect(within(activityPanel).getByText("exec.run", { selector: ".network-audit-action-chart code" })).toBeInTheDocument();
    expect(within(activityPanel).getByText("file.read", { selector: ".network-audit-action-chart code" })).toBeInTheDocument();
  }, 15000);

  it("keeps the newest doctor report when refresh responses finish out of order", async () => {
    const first = deferred<NetworkDoctorReport>();
    const second = deferred<NetworkDoctorReport>();
    const olderReport = { ...doctorReport, gateway: { ...doctorReport.gateway, revision: "older-revision" } };
    const newerReport = { ...doctorReport, gateway: { ...doctorReport.gateway, revision: "newer-revision" } };
    api.fetchDoctor.mockReset()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);

    render(<NetworkPage />);
    await waitFor(() => expect(api.fetchDoctor).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByTestId("network-refresh"));
    await waitFor(() => expect(api.fetchDoctor).toHaveBeenCalledTimes(2));

    await act(async () => {
      second.resolve(newerReport);
      await second.promise;
    });
    expect(screen.getByText("newer-revision")).toBeInTheDocument();

    await act(async () => {
      first.resolve(olderReport);
      await first.promise;
    });
    expect(screen.getByText("newer-revision")).toBeInTheDocument();
    expect(screen.queryByText("older-revision")).not.toBeInTheDocument();
  }, 15000);

  it("applies audit filters and walks to the next cursor page", async () => {
    api.fetchAudit.mockResolvedValue({ events: [], next_cursor: "cursor-2" });
    render(<NetworkPage />);
    await waitForLoadedPage();
    fireEvent.click(screen.getByRole("tab", { name: "Журнал" }));
    const auditPanel = await screen.findByTestId("network-audit");
    await waitFor(() => expect(api.fetchAudit).toHaveBeenCalledTimes(1));

    fireEvent.change(within(auditPanel).getByPlaceholderText("Фильтр node_id"), { target: { value: node.id } });
    fireEvent.change(within(auditPanel).getByPlaceholderText("Фильтр ID автора"), { target: { value: "web:user-17" } });
    fireEvent.click(within(auditPanel).getByRole("button", { name: "Применить" }));
    await waitFor(() => expect(api.fetchAudit).toHaveBeenCalledTimes(2));
    expect(api.fetchAudit.mock.calls[1][0]).toMatchObject({ node: node.id, actor: "web:user-17", limit: 50 });
    expect(api.fetchActivity.mock.calls[1][0]).toEqual({ window: "24h", node: node.id, actor: "web:user-17" });

    fireEvent.click(within(auditPanel).getByRole("button", { name: "Следующая" }));
    await waitFor(() => expect(api.fetchAudit).toHaveBeenCalledTimes(3));
    expect(api.fetchAudit.mock.calls[2][0]).toMatchObject({ node: node.id, actor: "web:user-17", before: "cursor-2", limit: 50 });
  }, 15000);

  it("keeps the latest audit response when requests finish out of order", async () => {
    const initial = deferred<{ events: NetworkAuditEvent[]; next_cursor?: string }>();
    const filtered = deferred<{ events: NetworkAuditEvent[]; next_cursor?: string }>();
    const poll = deferred<{ events: NetworkAuditEvent[]; next_cursor?: string }>();
    api.fetchAudit.mockReset();
    api.fetchAudit
      .mockImplementationOnce(() => initial.promise)
      .mockImplementationOnce(() => filtered.promise)
      .mockImplementation(() => poll.promise);

    render(<NetworkPage />);
    await waitForLoadedPage();
    fireEvent.click(screen.getByRole("tab", { name: "Журнал" }));
    const auditPanel = await screen.findByTestId("network-audit");
    await waitFor(() => expect(api.fetchAudit).toHaveBeenCalledTimes(1));

    fireEvent.change(within(auditPanel).getByPlaceholderText("Фильтр ID автора"), { target: { value: "web:latest" } });
    fireEvent.click(within(auditPanel).getByRole("button", { name: "Применить" }));
    await waitFor(() => expect(api.fetchAudit).toHaveBeenCalledTimes(2));

    vi.useFakeTimers();
    await act(async () => {
      filtered.resolve({ events: [auditEvent("latest", "Новый фильтр")], next_cursor: "latest-cursor" });
      await filtered.promise;
    });
    expect(within(auditPanel).getByText("Новый фильтр")).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(api.fetchAudit).toHaveBeenCalledTimes(3);
    await act(async () => {
      poll.resolve({ events: [auditEvent("latest", "Новый фильтр")], next_cursor: "latest-cursor" });
      await poll.promise;
    });
    vi.useRealTimers();

    await act(async () => {
      initial.resolve({ events: [auditEvent("stale", "Старый ответ")], next_cursor: "stale-cursor" });
    });
    expect(within(auditPanel).queryByText("Старый ответ")).not.toBeInTheDocument();
    expect(within(auditPanel).getByText("Новый фильтр")).toBeInTheDocument();
    expect(within(auditPanel).getByRole("button", { name: "Следующая" })).toBeEnabled();
  }, 15000);

  it("does not present an empty journal when the audit request fails", async () => {
    api.fetchAudit.mockRejectedValue(new Error("503 Service Unavailable"));
    render(<NetworkPage />);
    await waitForLoadedPage();
    fireEvent.click(screen.getByRole("tab", { name: "Журнал" }));
    const auditPanel = await screen.findByTestId("network-audit");

    await waitFor(() => expect(within(auditPanel).getByText("Не удалось загрузить журнал аудита.")).toBeInTheDocument());
    expect(within(auditPanel).queryByText("Событий аудита нет")).not.toBeInTheDocument();
  }, 15000);
});

function auditEvent(id: string, message: string): NetworkAuditEvent {
  return {
    id,
    timestamp: "2026-09-11T10:00:03.000Z",
    kind: "job.succeeded",
    actor: { id: "web:latest", name: "Alexey", source: "web" },
    node_id: node.id,
    action: "exec.run",
    state: "succeeded",
    message,
  };
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}
