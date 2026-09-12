import {
  CheckCircleOutlined,
  CloudServerOutlined,
  CodeOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  KeyOutlined,
  LockOutlined,
  ReloadOutlined,
  SendOutlined,
  StopOutlined,
  SyncOutlined,
  UnlockOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Checkbox,
  Drawer,
  Empty,
  Input,
  List,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PageLayout from "../../shared/components/PageLayout";
import AppPanel from "../../shared/components/AppPanel";
import CopyButton from "../../shared/components/CopyButton";
import { ApiError } from "../../api/errors";
import {
  cancelNetworkJob,
  createNetworkCredential,
  enrollNetworkNode,
  fetchNetworkActions,
  fetchNetworkAudit,
  fetchNetworkActivity,
  fetchNetworkCredentials,
  fetchNetworkDoctor,
  fetchNetworkJob,
  fetchNetworkJobs,
  fetchNetworkNodes,
  revokeNetworkCredential,
  setNetworkNodeDisabled,
  submitNetworkJob,
} from "./api";
import type {
  CreateCredentialRequest,
  EnrollmentToken,
  NetworkAction,
  NetworkAuditEvent,
  NetworkAuditQuery,
  NetworkActivity,
  NetworkActivityQuery,
  NetworkActivityWindow,
  NetworkDoctorReport,
  NetworkJob,
  NetworkJobProgress,
  NetworkNode,
  NetworkPrincipal,
  NetworkWorkflowFileEvidence,
  NetworkWorkflowResultData,
  SubmitNetworkJobRequest,
} from "./types";
import { nodeStatus } from "./utils";
import NetworkAuditActivity from "./NetworkAuditActivity";
import NetworkDoctor from "./NetworkDoctor";
import "./network.css";

const JOB_POLL_MS = 5_000;
const NODE_POLL_MS = 30_000;
const DEFAULT_TIMEOUT = 60;
const MAX_TIMEOUT = 1_800;
const AUDIT_LIMIT = 50;
const MAX_JOB_TIMELINE_EVENTS = 50;
const WORKFLOW_OPERATION_ACTIONS = new Set(["workflow.plan", "workflow.deploy", "workflow.restart"]);
const WORKFLOW_RECONCILE_ACTION = "workflow.reconcile";
const SCOPES = ["read", "exec", "write", "control", "admin"];
const NODE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/;
const SCOPE_LABELS: Record<string, string> = {
  read: "read — диагностика",
  exec: "exec — выполнение команд",
  write: "write — запись файлов",
  control: "control — управление сервисами",
  admin: "admin — управление доступами",
};

const ACTION_SAMPLES: Record<string, Record<string, unknown>> = {
  "system.info": {},
  "process.list": {},
  "file.list": { root: "srv", path: "." },
  "file.read": { root: "srv", path: "path/to/file", max_bytes: 8192 },
  "file.hash": { root: "srv", path: "path/to/file" },
  "file.write": { root: "srv", path: "path/to/file", expected_sha256: "<sha256>", content: "", dry_run: true },
  "file.rollback": { job_id: "<job-id>" },
  "log.tail": { root: "srv", path: "logs/service.log", max_bytes: 8192 },
  "exec.run": { argv: ["uptime"], root: "srv" },
  "runtime.status": { runtime: "velocity" },
  "runtime.console": { runtime: "velocity", command: "say gateway check" },
  "service.status": { name: "proxyarc" },
  "service.restart": { name: "proxyarc" },
  "container.list": {},
  "container.logs": { name: "proxyarc", tail: 100 },
  "container.restart": { name: "proxyarc" },
};

const stateLabels: Record<NetworkJob["state"], string> = {
  queued: "В очереди",
  dispatched: "Отправлена",
  running: "Выполняется",
  succeeded: "Успешно",
  failed: "Ошибка",
  cancelled: "Отменена",
  unknown: "Неизвестно",
};

const AUDIT_KIND_OPTIONS = [
  "job.queued",
  "job.dispatched",
  "job.running",
  "job.progress",
  "job.succeeded",
  "job.failed",
  "job.cancel_requested",
  "job.cancelled",
  "job.unknown",
  "job.rejected",
  "credential.created",
  "credential.revoked",
  "enrollment.created",
  "node.enrolled",
  "node.enabled",
  "node.disabled",
];
const AUDIT_PARAMETER_KEYS = new Set([
  "root",
  "path",
  "runtime",
  "name",
  "executable",
  "cwd",
  "job_id",
  "credential_id",
  "scopes",
  "nodes",
  "phase",
  "status",
  "target",
]);

type AuditFilters = {
  node: string;
  action: string;
  kind: string;
  actor: string;
};

const EMPTY_AUDIT_FILTERS: AuditFilters = { node: "", action: "", kind: "", actor: "" };

function auditQuery(filters: AuditFilters, before?: string): NetworkAuditQuery {
  const query: NetworkAuditQuery = { limit: AUDIT_LIMIT };
  if (filters.node.trim()) query.node = filters.node.trim();
  if (filters.action.trim()) query.action = filters.action.trim();
  if (filters.kind.trim()) query.kind = filters.kind.trim();
  if (filters.actor.trim()) query.actor = filters.actor.trim();
  if (before) query.before = before;
  return query;
}

function networkActivityQuery(filters: AuditFilters, window: NetworkActivityWindow): NetworkActivityQuery {
  const query: NetworkActivityQuery = { window };
  if (filters.node.trim()) query.node = filters.node.trim();
  if (filters.action.trim()) query.action = filters.action.trim();
  if (filters.actor.trim()) query.actor = filters.actor.trim();
  return query;
}

function auditActorLabel(event: NetworkAuditEvent): string {
  return event.actor?.name?.trim() || event.actor?.id || "Неизвестный actor";
}

function auditStateLabel(state?: string): string | null {
  if (!state) return null;
  return stateLabels[state as NetworkJob["state"]] ?? state;
}

function safeAuditParameters(event: NetworkAuditEvent): Array<[string, string]> {
  return Object.entries(event.parameters ?? {}).filter(([key]) => AUDIT_PARAMETER_KEYS.has(key));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createIdempotencyKey(): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

function statusLabel(status: ReturnType<typeof nodeStatus>): string {
  if (status === "online") return "Онлайн";
  if (status === "disabled") return "Отключён";
  return "Офлайн";
}

function statusColor(status: ReturnType<typeof nodeStatus>): string {
  if (status === "online") return "success";
  if (status === "disabled") return "default";
  return "error";
}

function formatTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function relativeTime(value: string | null, now = Date.now()): string {
  if (!value) return "нет heartbeat";
  const seconds = Math.max(0, Math.round((now - new Date(value).getTime()) / 1000));
  if (seconds < 10) return "только что";
  if (seconds < 60) return `${seconds} сек. назад`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} мин. назад`;
  return `${Math.floor(minutes / 60)} ч. назад`;
}

function errorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;
  if (error.status === 503) return "Server Gateway не настроен или временно недоступен (503). Проверьте сервис gateway.";
  if (error.status === 401 || error.status === 403) return "Сессия администратора истекла или не имеет доступа к Server Gateway.";
  if (error.body) {
    try {
      const payload = JSON.parse(error.body) as { error?: unknown; message?: unknown };
      if (typeof payload.error === "string" && payload.error.trim()) return payload.error.trim();
      if (typeof payload.message === "string" && payload.message.trim()) return payload.message.trim();
    } catch {
      // Keep ApiError's normal display fallback for non-JSON bodies.
    }
  }
  return error.displayMessage() || fallback;
}

function actionSample(action: NetworkAction, node?: NetworkNode | null): Record<string, unknown> {
  const root = node?.roots?.[0];
  const runtime = node?.runtimes?.[0];
  const catalogSample = ACTION_SAMPLES[action.name];
  if (catalogSample) {
    const sample = { ...catalogSample };
    if ("root" in sample) {
      if (root) sample.root = root;
      else delete sample.root;
    }
    if ("runtime" in sample) {
      if (runtime) sample.runtime = runtime;
      else delete sample.runtime;
    }
    return sample;
  }
  if (action.name.startsWith("file.")) return root ? { root, path: "path/to/file" } : { path: "path/to/file" };
  if (action.name.startsWith("service.")) return { name: "proxyarc" };
  if (action.name.startsWith("container.")) return { name: "proxyarc" };
  if (action.name.startsWith("runtime.")) return runtime ? { runtime } : {};
  return {};
}

function defaultTimeoutForAction(actionName: string | null | undefined): number {
  return actionName?.startsWith("workflow.") || actionName === "file.import" || actionName === "file.export"
    ? MAX_TIMEOUT
    : DEFAULT_TIMEOUT;
}

function normalizeNode(node: NetworkNode): NetworkNode {
  return {
    ...node,
    roots: node.roots ?? [],
    runtimes: node.runtimes ?? [],
    actions: node.actions ?? [],
    labels: node.labels ?? {},
  };
}

function isValidNodeId(value: string): boolean {
  return NODE_ID_PATTERN.test(value.trim());
}

function jsonText(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "{}";
  }
}

function isWorkflowOperationAction(action?: string): boolean {
  return Boolean(action && WORKFLOW_OPERATION_ACTIONS.has(action));
}

function workflowOperationID(job: NetworkJob): string | null {
  if (isWorkflowOperationAction(job.request.action)) return job.id;
  if (job.request.action !== WORKFLOW_RECONCILE_ACTION) return null;
  const operationID = job.request.args?.operation_id;
  return typeof operationID === "string" && operationID.trim() ? operationID : null;
}

function workflowResultData(value: unknown): NetworkWorkflowResultData | null {
  if (!isRecord(value)) return null;
  const files = Array.isArray(value.files) ? value.files.filter(isRecord) as NetworkWorkflowFileEvidence[] : undefined;
  const nextSteps = Array.isArray(value.next_steps) ? value.next_steps.filter((step): step is string => typeof step === "string") : undefined;
  return {
    operation_id: typeof value.operation_id === "string" ? value.operation_id : undefined,
    checked_at: typeof value.checked_at === "string" ? value.checked_at : undefined,
    delivery: typeof value.delivery === "string" ? value.delivery : undefined,
    activation: typeof value.activation === "string" ? value.activation : undefined,
    files,
    runtime: value.runtime,
    record: isRecord(value.record) ? value.record : undefined,
    next_steps: nextSteps,
    cancellation_boundary: typeof value.cancellation_boundary === "string" ? value.cancellation_boundary : undefined,
  };
}

const WORKFLOW_DELIVERY_LABELS: Record<string, string> = {
  delivered: "Доставлено",
  planned: "Запланировано",
  not_applicable: "Не применимо",
  unknown: "Неизвестно",
};

const WORKFLOW_ACTIVATION_LABELS: Record<string, string> = {
  activated: "Активировано",
  not_requested: "Не запрашивалось",
  unknown: "Неизвестно",
};

const WORKFLOW_FILE_STATUS_LABELS: Record<string, string> = {
  matches: "Совпадает",
  missing: "Файл отсутствует",
  changed: "Изменён",
  unreadable: "Не удалось прочитать",
  unknown: "Неизвестно",
};

function workflowStatusLabel(value: unknown, labels: Record<string, string>): string {
  if (typeof value !== "string" || !value.trim()) return "Неизвестно";
  return labels[value] ?? value;
}

function workflowStatusColor(value: unknown): string {
  if (value === "delivered" || value === "activated") return "success";
  if (value === "planned") return "processing";
  if (value === "unknown") return "warning";
  return "default";
}

function workflowFileMismatch(file: NetworkWorkflowFileEvidence): boolean {
  const expected = file.expected_sha256?.trim();
  const actual = file.actual_sha256?.trim();
  return file.status === "changed" || file.status === "missing" || file.status === "unreadable"
    || Boolean(expected && actual && expected.toLowerCase() !== actual.toLowerCase());
}

function updateJobSummary(summary: NetworkJob, detail: NetworkJob): NetworkJob {
  const updated: NetworkJob = {
    ...summary,
    principal: detail.principal,
    state: detail.state,
    started_at: detail.started_at,
    completed_at: detail.completed_at,
    cancel_requested: detail.cancel_requested,
    archived: detail.archived,
  };
  if ("progress" in detail) updated.progress = detail.progress;
  return updated;
}

function progressMarker(progress?: NetworkJobProgress | null): string {
  if (!progress) return "";
  return [progress.sequence, progress.at, progress.phase, progress.status, progress.target, progress.message].join("\u0000");
}

function progressText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function progressSequence(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) ? `#${value}` : "#—";
}

function progressTagColor(status: unknown): string {
  const normalized = progressText(status, "").toLowerCase();
  if (["succeeded", "success", "completed", "complete", "done", "ok", "ready", "planned", "delivered"].includes(normalized)) return "success";
  if (["failed", "failure", "error"].includes(normalized)) return "error";
  if (["cancelled", "canceled"].includes(normalized)) return "default";
  if (["running", "started", "in_progress", "in-progress", "pending", "waiting", "joined", "scheduled", "downloading", "staged"].includes(normalized)) return "processing";
  return "default";
}

function isJobProgressEvent(value: unknown): value is NetworkJobProgress {
  return isRecord(value);
}

function JobProgressPanel({ job }: { job: NetworkJob }) {
  const timeline = Array.isArray(job.events) ? job.events.filter(isJobProgressEvent) : [];
  const latest = job.progress ?? timeline[timeline.length - 1] ?? null;
  if (!latest && timeline.length === 0) return null;

  const visibleEvents = timeline.length > MAX_JOB_TIMELINE_EVENTS
    ? timeline.slice(-MAX_JOB_TIMELINE_EVENTS)
    : timeline;
  const hiddenEvents = timeline.length - visibleEvents.length;

  return (
    <section className="network-job-progress" data-testid="network-job-progress">
      {latest ? (
        <div className="network-job-progress__current">
          <span className="network-eyebrow">Текущий прогресс</span>
          <div className="network-job-progress__headline">
            <strong>{progressText(latest.phase, "Безымянный этап")}</strong>
            <Tag color={progressTagColor(latest.status)}>{progressText(latest.status, "Статус неизвестен")}</Tag>
          </div>
          <div className="network-job-progress__meta">
            <span>{progressSequence(latest.sequence)} · {formatTime(latest.at)}</span>
            {progressText(latest.target, "") ? <span>Сервер: <code>{progressText(latest.target, "")}</code></span> : null}
          </div>
          {progressText(latest.message, "") ? <p>{progressText(latest.message, "")}</p> : null}
        </div>
      ) : null}
      {visibleEvents.length ? (
        <div className="network-job-progress__timeline">
          <div className="network-job-progress__timeline-heading">
            <strong>Этапы</strong>
            <span>{hiddenEvents ? `Показаны последние ${visibleEvents.length} из ${timeline.length}` : `${timeline.length} событий`}</span>
          </div>
          <ol>
            {visibleEvents.map((event, index) => (
              <li key={`${progressSequence(event.sequence)}-${event.at}-${index}`}>
                <span className="network-job-progress__dot" data-status={progressTagColor(event.status)} />
                <div className="network-job-progress__event">
                  <div className="network-job-progress__event-head">
                    <strong>{progressText(event.phase, "Безымянный этап")}</strong>
                    <Tag color={progressTagColor(event.status)}>{progressText(event.status, "Статус неизвестен")}</Tag>
                  </div>
                  <div className="network-job-progress__meta">
                    <span>{progressSequence(event.sequence)} · {formatTime(event.at)}</span>
                    {progressText(event.target, "") ? <span>Сервер: <code>{progressText(event.target, "")}</code></span> : null}
                  </div>
                  {progressText(event.message, "") ? <p>{progressText(event.message, "")}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}

function NodeStatusTag({ node, now }: { node: NetworkNode; now: number }) {
  const status = nodeStatus(node, now);
  return <Tag color={statusColor(status)}>{statusLabel(status)}</Tag>;
}

function JobStateTag({ state, workflowAction = false }: { state: NetworkJob["state"]; workflowAction?: boolean }) {
  const color = state === "succeeded" && workflowAction ? "default" : state === "succeeded" ? "success" : state === "failed" ? "error" : state === "cancelled" ? "default" : state === "running" ? "processing" : "warning";
  const label = state === "succeeded" && workflowAction ? "Job завершён" : stateLabels[state];
  return <Tag color={color}>{label}</Tag>;
}

function SecretTokenModal({
  token,
  title,
  command,
  instructions,
  onClose,
}: {
  token: string | null;
  title: string;
  command: string;
  instructions: string;
  onClose: () => void;
}) {
  return (
    <Modal open={Boolean(token)} title={title} footer={null} onCancel={onClose} destroyOnHidden>
      {token ? (
        <div className="network-secret">
          <Alert
            type="warning"
            showIcon
            message="Секрет показывается один раз"
            description="Скопируйте его сейчас. После закрытия окна восстановить токен через панель нельзя."
          />
          <div className="network-secret__value">
            <code>{token}</code>
            <CopyButton value={token} />
          </div>
          <Typography.Text type="secondary">Команда для подключения агента</Typography.Text>
          <Typography.Paragraph type="secondary">{instructions}</Typography.Paragraph>
          <div className="network-secret__command">
            <code>{command}</code>
            <CopyButton value={command} />
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

function workflowCollectionSummary(value: unknown, fallback = "нет данных"): string {
  if (Array.isArray(value)) return `${value.length} ${value.length === 1 ? "элемент" : "элементов"}`;
  if (isRecord(value)) return `${Object.keys(value).length} ${Object.keys(value).length === 1 ? "запись" : "записей"}`;
  if (typeof value === "boolean") return value ? "да" : "нет";
  if (typeof value === "string" && value.trim()) return value;
  return fallback;
}

function WorkflowFileEvidence({ file }: { file: NetworkWorkflowFileEvidence }) {
  const mismatch = workflowFileMismatch(file);
  const status = file.status?.trim() || "unknown";
  const expected = file.expected_sha256?.trim();
  const actual = file.actual_sha256?.trim();
  return (
    <li className={mismatch ? "network-workflow-evidence__file network-workflow-evidence__file--mismatch" : "network-workflow-evidence__file"}>
      <div className="network-workflow-evidence__file-heading">
        <span><strong>{file.runtime || "runtime"}</strong> · <code>{file.path || "путь неизвестен"}</code></span>
        <Tag color={mismatch ? "error" : status === "matches" ? "success" : "warning"}>{mismatch ? "Хэш не совпадает" : workflowStatusLabel(status, WORKFLOW_FILE_STATUS_LABELS)}</Tag>
      </div>
      {expected || actual ? (
        <details>
          <summary>Сверить SHA-256</summary>
          <div className="network-workflow-evidence__hashes">
            <span>Ожидался <code>{expected || "—"}</code></span>
            <span>Получен <code>{actual || "—"}</code></span>
          </div>
        </details>
      ) : null}
    </li>
  );
}

function WorkflowEvidencePanel({
  job,
  onReconcile,
  reconciling,
}: {
  job: NetworkJob;
  onReconcile: () => void;
  reconciling: boolean;
}) {
  const operation = isWorkflowOperationAction(job.request.action) || job.request.action === WORKFLOW_RECONCILE_ACTION;
  const operationID = workflowOperationID(job);
  if (!operation || !operationID) return null;

  const data = workflowResultData(job.result?.data);
  const files = data?.files ?? [];
  const delivery = data?.delivery;
  const activation = data?.activation;
  const confirmed = (delivery === "delivered" || delivery === "not_applicable")
    && (activation === "activated" || activation === "not_requested");
  const terminal = ["succeeded", "failed", "cancelled", "unknown"].includes(job.state);
  const record = data?.record;
  const hasMismatch = files.some(workflowFileMismatch);
  const canReconcile = isWorkflowOperationAction(job.request.action);

  return (
    <section className="network-workflow-evidence" data-testid="network-workflow-evidence">
      <div className="network-workflow-evidence__heading">
        <div>
          <span className="network-eyebrow">Операция</span>
          <div className="network-workflow-evidence__operation"><code>{operationID}</code><CopyButton value={operationID} /></div>
        </div>
        {canReconcile ? <Button icon={<SyncOutlined />} onClick={onReconcile} loading={reconciling} disabled={reconciling}>
          Сверить результат
        </Button> : null}
      </div>
      {isWorkflowOperationAction(job.request.action) ? (
        <Alert
          type="warning"
          showIcon
          message="Граница отмены"
          description="Отмена останавливает ожидание или выполнение, где это возможно; доставленные файлы и общий countdown могут остаться. Отмена не является откатом."
        />
      ) : null}
      <div className="network-workflow-evidence__statuses">
        <span>Доставка <Tag color={workflowStatusColor(delivery)}>{workflowStatusLabel(delivery, WORKFLOW_DELIVERY_LABELS)}</Tag></span>
        <span>Активация <Tag color={workflowStatusColor(activation)}>{workflowStatusLabel(activation, WORKFLOW_ACTIVATION_LABELS)}</Tag></span>
      </div>
      {terminal && !confirmed ? (
        <Alert
          type="warning"
          showIcon
          message="Job завершён, но это не подтверждает доставку или активацию"
          description={data ? "Смотрите статусы и файловые хэши выше; при неопределённости запустите сверку результата." : "Подтверждающее readback-данные отсутствуют; запустите сверку результата."}
          data-testid="network-workflow-unconfirmed"
        />
      ) : null}
      {hasMismatch ? <Alert type="error" showIcon message="Есть несовпадения файловых хэшей" /> : null}
      {files.length ? (
        <div className="network-workflow-evidence__section">
          <div className="network-workflow-evidence__section-heading"><strong>Файлы</strong><span>{files.length}</span></div>
          <ul>{files.map((file, index) => <WorkflowFileEvidence key={`${file.runtime}-${file.path}-${index}`} file={file} />)}</ul>
        </div>
      ) : null}
      {data?.runtime !== undefined || record ? (
        <div className="network-workflow-evidence__section">
          <div className="network-workflow-evidence__section-heading"><strong>Readback</strong><span>{data?.checked_at ? `проверено ${formatTime(data.checked_at)}` : "текущая сверка"}</span></div>
          <div className="network-workflow-evidence__record">
            {data?.runtime !== undefined ? <span>Runtime: <strong>{workflowCollectionSummary(data.runtime)}</strong></span> : null}
            {record ? <>
              <span>События: <strong>{workflowCollectionSummary(record.events, "0 событий")}</strong></span>
              <span>До: <strong>{workflowCollectionSummary(record.before)}</strong></span>
              <span>После: <strong>{workflowCollectionSummary(record.after)}</strong></span>
              <span>Артефакты: <strong>{workflowCollectionSummary(record.artifacts)}</strong></span>
              <span>Цели: <strong>{workflowCollectionSummary(record.targets)}</strong></span>
              <span>Общий countdown: <strong>{workflowCollectionSummary(record.shared_countdown)}</strong></span>
              {typeof record.native_manifest_id === "string" && record.native_manifest_id ? <span>Manifest: <code>{record.native_manifest_id}</code></span> : null}
            </> : null}
          </div>
        </div>
      ) : null}
      {data?.next_steps?.length ? (
        <div className="network-workflow-evidence__section">
          <div className="network-workflow-evidence__section-heading"><strong>Следующие шаги</strong><span>{data.next_steps.length}</span></div>
          <ul className="network-workflow-evidence__steps">{data.next_steps.map((step, index) => <li key={`${step}-${index}`}>{step}</li>)}</ul>
        </div>
      ) : null}
      {data?.cancellation_boundary ? <Typography.Text type="secondary">{data.cancellation_boundary}</Typography.Text> : null}
    </section>
  );
}

function JobResultDrawer({
  job,
  loading,
  onClose,
  onRefresh,
  onCancel,
  onReconcile,
  reconciling,
}: {
  job: NetworkJob | null;
  loading: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onCancel: () => void;
  onReconcile: () => void;
  reconciling: boolean;
}) {
  const result = job?.result;
  return (
    <Drawer
      open={Boolean(job)}
      title={job ? `Результат · ${job.request.action}` : "Результат job"}
      onClose={onClose}
      width={760}
      className="network-result-drawer"
    >
      {loading && !job ? <Spin /> : null}
      {job ? (
        <div className="network-result">
          <div className="network-result__meta">
            <span><strong>Job</strong> <code>{job.id}</code></span>
            <JobStateTag state={job.state} workflowAction={isWorkflowOperationAction(job.request.action) || job.request.action === WORKFLOW_RECONCILE_ACTION} />
            <span>создана {formatTime(job.created_at)}</span>
            <Button type="text" icon={<ReloadOutlined />} onClick={onRefresh}>Обновить</Button>
          </div>
          <div className="network-result__request">
            <span>Узел: <strong>{job.request.node_id}</strong></span>
            <span>Timeout: {job.request.timeout_seconds} сек.</span>
            {job.cancel_requested ? <Tag color="warning">Отмена запрошена</Tag> : null}
          </div>
          <WorkflowEvidencePanel job={job} onReconcile={onReconcile} reconciling={reconciling} />
          <JobProgressPanel job={job} />
          {job.archived ? <Alert type="info" showIcon message="Сохранены только сведения о задании; полный результат вышел за лимит истории." /> : <>
            {result?.error ? <Alert type="error" showIcon message={result.error} /> : null}
            <ResultBlock title="stdout" value={result?.stdout} />
            <ResultBlock title="stderr" value={result?.stderr} error />
            <div className="network-result__exit">
              <span>exit code</span>
              <code>{result?.exit_code ?? "—"}</code>
              {result?.truncated ? <Tag color="warning">Вывод обрезан</Tag> : null}
            </div>
            {result?.data !== undefined ? <ResultBlock title="data (JSON)" value={jsonText(result.data)} /> : null}
          </>}
          {job.state === "queued" || job.state === "dispatched" || job.state === "running" ? (
            <Button danger icon={<StopOutlined />} onClick={onCancel} loading={job.cancel_requested}>
              Отменить job
            </Button>
          ) : null}
        </div>
      ) : null}
    </Drawer>
  );
}

function ResultBlock({ title, value, error = false }: { title: string; value?: string; error?: boolean }) {
  return (
    <section className={error ? "network-result__block network-result__block--error" : "network-result__block"}>
      <header><span>{title}</span>{value ? <CopyButton value={value} /> : null}</header>
      <pre>{value || "Нет данных"}</pre>
    </section>
  );
}

function AuditPanel({
  events,
  activity,
  activityLoading,
  activityError,
  activityWindow,
  filters,
  loading,
  error,
  hasPrevious,
  hasNext,
  autoRefresh,
  onFilterChange,
  onApply,
  onReset,
  onRefresh,
  onPrevious,
  onNext,
  onAutoRefreshChange,
  onActivityWindowChange,
  onOpenJob,
}: {
  events: NetworkAuditEvent[];
  activity: NetworkActivity | null;
  activityLoading: boolean;
  activityError: string | null;
  activityWindow: NetworkActivityWindow;
  filters: AuditFilters;
  loading: boolean;
  error: string | null;
  hasPrevious: boolean;
  hasNext: boolean;
  autoRefresh: boolean;
  onFilterChange: (field: keyof AuditFilters, value: string) => void;
  onApply: () => void;
  onReset: () => void;
  onRefresh: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onAutoRefreshChange: (value: boolean) => void;
  onActivityWindowChange: (value: NetworkActivityWindow) => void;
  onOpenJob: (jobID: string) => void;
}) {
  return (
    <div className="network-audit" data-testid="network-audit">
      <div className="network-audit__toolbar">
        <Input placeholder="Фильтр node_id" value={filters.node} onChange={(event) => onFilterChange("node", event.target.value)} />
        <Input placeholder="Фильтр action" value={filters.action} onChange={(event) => onFilterChange("action", event.target.value)} />
        <Select
          allowClear
          placeholder="Все типы событий"
          value={filters.kind || undefined}
          options={AUDIT_KIND_OPTIONS.map((kind) => ({ value: kind, label: kind }))}
          onChange={(value) => onFilterChange("kind", value ?? "")}
        />
        <Input placeholder="Фильтр ID автора" value={filters.actor} onChange={(event) => onFilterChange("actor", event.target.value)} />
        <Space wrap>
          <Button type="primary" onClick={onApply}>Применить</Button>
          <Button onClick={onReset}>Сбросить</Button>
        </Space>
      </div>
      <NetworkAuditActivity activity={activity} loading={activityLoading} error={activityError} window={activityWindow} onWindowChange={onActivityWindowChange} />
      {error ? <Alert className="network-inline-alert" type="warning" showIcon message={error} /> : null}
      {loading && events.length === 0 ? <div className="network-panel-loading"><Spin /></div> : events.length === 0 ? error ? null : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Событий аудита нет" /> : (
        <List
          className="network-audit-list"
          dataSource={events}
          renderItem={(event) => {
            const state = auditStateLabel(event.state);
            const parameters = safeAuditParameters(event);
            return (
              <List.Item actions={event.job_id ? [<Button key="job" type="link" onClick={() => onOpenJob(event.job_id as string)}>Открыть job</Button>] : undefined}>
                <List.Item.Meta
                  title={<span className="network-audit-event__title"><code>{event.kind}</code>{state ? <Tag color={state === "Успешно" ? "success" : state === "Ошибка" ? "error" : "default"}>{state}</Tag> : null}</span>}
                  description={<span>{formatTime(event.timestamp)} · <strong>{auditActorLabel(event)}</strong> · автор: <code>{event.actor?.id || "—"}</code> · источник: {event.actor?.source || "—"}</span>}
                />
                <div className="network-audit-event__body">
                  <div className="network-audit-event__route">
                    {event.node_id ? <span>узел <code>{event.node_id}</code></span> : null}
                    {event.action ? <span>действие <code>{event.action}</code></span> : null}
                    {event.exit_code !== undefined ? <span>exit code <code>{event.exit_code}</code></span> : null}
                  </div>
                  {event.message ? <div className="network-audit-event__message">{event.message}</div> : null}
                  {event.actor?.credential_name ? <div className="network-audit-event__meta">credential: {event.actor.credential_name}</div> : null}
                  {parameters.length ? <div className="network-audit-event__parameters"><span>Параметры</span>{parameters.map(([key, value]) => <code key={key}>{key}={value}</code>)}</div> : null}
                  <div className="network-audit-event__id">{event.id}</div>
                </div>
              </List.Item>
            );
          }}
        />
      )}
      <div className="network-audit__footer">
        <Space>
          <Button onClick={onPrevious} disabled={!hasPrevious || loading}>Предыдущая</Button>
          <Button onClick={onNext} disabled={!hasNext || loading}>Следующая</Button>
        </Space>
        <Space>
          <Checkbox checked={autoRefresh} onChange={(event) => onAutoRefreshChange(event.target.checked)}>Автообновление · 5 сек.</Checkbox>
          <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>Обновить</Button>
        </Space>
      </div>
    </div>
  );
}

export default function NetworkPage() {
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [actions, setActions] = useState<NetworkAction[]>([]);
  const [jobs, setJobs] = useState<NetworkJob[]>([]);
  const [auditEvents, setAuditEvents] = useState<NetworkAuditEvent[]>([]);
  const [networkActivity, setNetworkActivity] = useState<NetworkActivity | null>(null);
  const [activityWindow, setActivityWindow] = useState<NetworkActivityWindow>("24h");
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [doctorReport, setDoctorReport] = useState<NetworkDoctorReport | null>(null);
  const [doctorLoading, setDoctorLoading] = useState(false);
  const [doctorError, setDoctorError] = useState<string | null>(null);
  const [auditFilters, setAuditFilters] = useState<AuditFilters>(EMPTY_AUDIT_FILTERS);
  const [auditDraftFilters, setAuditDraftFilters] = useState<AuditFilters>(EMPTY_AUDIT_FILTERS);
  const [auditBefore, setAuditBefore] = useState<string | undefined>();
  const [auditBeforeHistory, setAuditBeforeHistory] = useState<Array<string | undefined>>([]);
  const [auditNextCursor, setAuditNextCursor] = useState<string | undefined>();
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditLoaded, setAuditLoaded] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditAutoRefresh, setAuditAutoRefresh] = useState(true);
  const [historyTab, setHistoryTab] = useState("jobs");
  const [credentials, setCredentials] = useState<NetworkPrincipal[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedActionName, setSelectedActionName] = useState<string | null>(null);
  const [nodeSearch, setNodeSearch] = useState("");
  const [actionSearch, setActionSearch] = useState("");
  const [argsText, setArgsText] = useState("{}");
  const [timeoutSeconds, setTimeoutSeconds] = useState(DEFAULT_TIMEOUT);
  const [loading, setLoading] = useState(true);
  const [credentialsLoading, setCredentialsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [nodesError, setNodesError] = useState<string | null>(null);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [credentialsError, setCredentialsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [retryRequest, setRetryRequest] = useState<SubmitNetworkJobRequest | null>(null);
  const [mutatingRequest, setMutatingRequest] = useState<{ request: SubmitNetworkJobRequest; actionName: string; nodeName: string } | null>(null);
  const [selectedJob, setSelectedJob] = useState<NetworkJob | null>(null);
  const [jobLoading, setJobLoading] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [enrollmentOpen, setEnrollmentOpen] = useState(false);
  const [enrollmentName, setEnrollmentName] = useState("");
  const [enrollmentNodeId, setEnrollmentNodeId] = useState("");
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [enrollmentToken, setEnrollmentToken] = useState<EnrollmentToken | null>(null);
  const [credentialOpen, setCredentialOpen] = useState(false);
  const [credentialName, setCredentialName] = useState("");
  const [credentialNodes, setCredentialNodes] = useState<string[]>([]);
  const [credentialScopes, setCredentialScopes] = useState<string[]>(["read"]);
  const [credentialLoading, setCredentialLoading] = useState(false);
  const [credentialToken, setCredentialToken] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const requestKeyRef = useRef<string | null>(null);
  const auditRequestRef = useRef(0);
  const auditLoadingRef = useRef(false);
  const activityRequestRef = useRef(0);
  const activityQueryRef = useRef("");
  const doctorRequestRef = useRef(0);
  const sampleSelectionRef = useRef<{ nodeId: string | null; actionName: string | null } | null>(null);
  const jobRequestRef = useRef(0);
  const submitRequestRef = useRef(0);

  const loadDoctor = useCallback(async () => {
    const requestID = doctorRequestRef.current + 1;
    doctorRequestRef.current = requestID;
    setDoctorLoading(true);
    setDoctorError(null);
    try {
      const response = await fetchNetworkDoctor();
      if (requestID !== doctorRequestRef.current) return;
      setDoctorReport(response);
    } catch (error) {
      if (requestID !== doctorRequestRef.current) return;
      setDoctorError(errorMessage(error, "Не удалось получить диагностику gateway."));
    } finally {
      if (requestID === doctorRequestRef.current) setDoctorLoading(false);
    }
  }, []);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [nodeResponse, actionResponse, jobResponse] = await Promise.all([
        fetchNetworkNodes(),
        fetchNetworkActions(),
        fetchNetworkJobs(),
      ]);
      setNodes((nodeResponse.nodes ?? []).map(normalizeNode));
      setNodesError(null);
      setActions(actionResponse.actions ?? []);
      setJobs(jobResponse.jobs ?? []);
      setJobsError(null);
    } catch (error) {
      setLoadError(errorMessage(error, "Не удалось загрузить Server Gateway."));
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshNodes = useCallback(async () => {
    try {
      const response = await fetchNetworkNodes();
      setNodes((response.nodes ?? []).map(normalizeNode));
      setNodesError(null);
    } catch (error) {
      // Keep the last known node snapshot while the heartbeat endpoint is unavailable.
      setNodesError(errorMessage(error, "Не удалось обновить heartbeat узлов."));
    }
  }, []);

  const refreshJobs = useCallback(async () => {
    try {
      const response = await fetchNetworkJobs();
      setJobs(response.jobs ?? []);
      setJobsError(null);
    } catch (error) {
      setJobsError(errorMessage(error, "Не удалось обновить список job-ов."));
    }
  }, []);

  const loadActivity = useCallback(async (filters: AuditFilters, window: NetworkActivityWindow) => {
    const requestID = activityRequestRef.current + 1;
    activityRequestRef.current = requestID;
    const query = networkActivityQuery(filters, window);
    const queryKey = JSON.stringify(query);
    if (queryKey !== activityQueryRef.current) {
      activityQueryRef.current = queryKey;
      setNetworkActivity(null);
    }
    setActivityLoading(true);
    setActivityError(null);
    try {
      const response = await fetchNetworkActivity(query);
      if (requestID !== activityRequestRef.current) return;
      setNetworkActivity(response);
    } catch (error) {
      if (requestID !== activityRequestRef.current) return;
      setNetworkActivity(null);
      setActivityError(errorMessage(error, "Не удалось загрузить метрики активности."));
    } finally {
      if (requestID === activityRequestRef.current) setActivityLoading(false);
    }
  }, []);

  const loadAudit = useCallback(async (filters: AuditFilters, before?: string): Promise<number | null> => {
    const requestID = auditRequestRef.current + 1;
    auditRequestRef.current = requestID;
    auditLoadingRef.current = true;
    setAuditLoading(true);
    setAuditError(null);
    void loadActivity(filters, activityWindow);
    try {
      const response = await fetchNetworkAudit(auditQuery(filters, before));
      if (requestID !== auditRequestRef.current) return null;
      setAuditEvents(response.events ?? []);
      setAuditNextCursor(response.next_cursor || undefined);
      setAuditLoaded(true);
      return requestID;
    } catch (error) {
      if (requestID !== auditRequestRef.current) return null;
      setAuditError(errorMessage(error, "Не удалось загрузить журнал аудита."));
      return null;
    } finally {
      if (requestID === auditRequestRef.current) {
        auditLoadingRef.current = false;
        setAuditLoading(false);
      }
    }
  }, [activityWindow, loadActivity]);

  const refreshAudit = useCallback(() => loadAudit(auditFilters, auditBefore), [auditBefore, auditFilters, loadAudit]);

  const applyAuditFilters = async () => {
    const filters = {
      node: auditDraftFilters.node.trim(),
      action: auditDraftFilters.action.trim(),
      kind: auditDraftFilters.kind.trim(),
      actor: auditDraftFilters.actor.trim(),
    };
    setAuditFilters(filters);
    setAuditBefore(undefined);
    setAuditBeforeHistory([]);
    await loadAudit(filters);
  };

  const resetAuditFilters = async () => {
    setAuditDraftFilters(EMPTY_AUDIT_FILTERS);
    setAuditFilters(EMPTY_AUDIT_FILTERS);
    setAuditBefore(undefined);
    setAuditBeforeHistory([]);
    await loadAudit(EMPTY_AUDIT_FILTERS);
  };

  const changeActivityWindow = (window: NetworkActivityWindow) => {
    setActivityWindow(window);
    if (historyTab === "audit" && auditLoaded) void loadActivity(auditFilters, window);
  };

  const loadNextAuditPage = async () => {
    if (!auditNextCursor || auditLoading) return;
    const requestID = await loadAudit(auditFilters, auditNextCursor);
    if (requestID === null || requestID !== auditRequestRef.current) return;
    setAuditBeforeHistory((current) => [...current, auditBefore]);
    setAuditBefore(auditNextCursor);
  };

  const loadPreviousAuditPage = async () => {
    if (auditBeforeHistory.length === 0 || auditLoading) return;
    const previous = auditBeforeHistory[auditBeforeHistory.length - 1];
    const requestID = await loadAudit(auditFilters, previous);
    if (requestID === null || requestID !== auditRequestRef.current) return;
    setAuditBeforeHistory((current) => current.slice(0, -1));
    setAuditBefore(previous);
  };

  const loadCredentials = useCallback(async () => {
    setCredentialsLoading(true);
    setCredentialsError(null);
    try {
      const response = await fetchNetworkCredentials();
      setCredentials(response.credentials ?? []);
    } catch (error) {
      setCredentialsError(errorMessage(error, "Не удалось загрузить credentials."));
    } finally {
      setCredentialsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkspace();
    void loadCredentials();
    void loadDoctor();
    const clock = window.setInterval(() => setNow(Date.now()), NODE_POLL_MS);
    const nodePoll = window.setInterval(() => void refreshNodes(), NODE_POLL_MS);
    const poll = window.setInterval(() => void refreshJobs(), JOB_POLL_MS);
    return () => {
      window.clearInterval(clock);
      window.clearInterval(nodePoll);
      window.clearInterval(poll);
    };
  }, [loadCredentials, loadDoctor, loadWorkspace, refreshJobs, refreshNodes]);

  const filteredNodes = useMemo(() => {
    const query = nodeSearch.trim().toLowerCase();
    if (!query) return nodes;
    return nodes.filter((node) => [node.name, node.hostname, node.os, node.arch, ...Object.values(node.labels)].some((value) => value.toLowerCase().includes(query)));
  }, [nodeSearch, nodes]);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? nodes[0] ?? null;
  const availableActions = useMemo(() => {
    if (!selectedNode) return [];
    const capabilities = new Set(selectedNode.actions);
    return actions.filter((action) => capabilities.has(action.name));
  }, [actions, selectedNode]);

  const filteredActions = useMemo(() => {
    const query = actionSearch.trim().toLowerCase();
    if (!query) return availableActions;
    return availableActions.filter((action) => `${action.name} ${action.description} ${action.scope}`.toLowerCase().includes(query));
  }, [actionSearch, availableActions]);

  const selectedAction = availableActions.find((action) => action.name === selectedActionName) ?? availableActions[0] ?? null;

  useEffect(() => {
    setSelectedNodeId((current) => current && nodes.some((node) => node.id === current) ? current : nodes[0]?.id ?? null);
  }, [nodes]);

  useEffect(() => {
    setSelectedActionName((current) => current && availableActions.some((action) => action.name === current) ? current : availableActions[0]?.name ?? null);
  }, [availableActions]);

  useEffect(() => {
    const actionName = selectedAction?.name ?? null;
    const previous = sampleSelectionRef.current;
    if (previous?.nodeId === selectedNodeId && previous.actionName === actionName) return;
    sampleSelectionRef.current = { nodeId: selectedNodeId, actionName };
    setTimeoutSeconds(defaultTimeoutForAction(actionName));
    if (selectedAction) setArgsText(jsonText(actionSample(selectedAction, selectedNode)));
  }, [selectedAction, selectedNode, selectedNodeId]);

  const onlineCount = nodes.filter((node) => nodeStatus(node, now) === "online").length;
  const offlineCount = nodes.filter((node) => nodeStatus(node, now) === "offline").length;
  const disabledCount = nodes.filter((node) => nodeStatus(node, now) === "disabled").length;

  const openJob = async (job: NetworkJob) => {
    const requestID = ++jobRequestRef.current;
    setSelectedJob(job);
    setReconciling(false);
    setJobLoading(true);
    try {
      const detail = await fetchNetworkJob(job.id);
      if (requestID !== jobRequestRef.current) return;
      setSelectedJob(detail);
      setJobs((current) => current.map((item) => item.id === detail.id ? updateJobSummary(item, detail) : item));
    } catch (error) {
      if (requestID !== jobRequestRef.current) return;
      message.error(errorMessage(error, "Не удалось загрузить результат job-а."));
    } finally {
      if (requestID === jobRequestRef.current) setJobLoading(false);
    }
  };

  const openJobById = async (jobID: string) => {
    const summary = jobs.find((job) => job.id === jobID);
    if (summary) {
      await openJob(summary);
      return;
    }
    const requestID = ++jobRequestRef.current;
    setSelectedJob(null);
    setReconciling(false);
    setJobLoading(true);
    try {
      const detail = await fetchNetworkJob(jobID);
      if (requestID !== jobRequestRef.current) return;
      setSelectedJob(detail);
      setJobs((current) => current.some((job) => job.id === detail.id) ? current.map((job) => job.id === detail.id ? updateJobSummary(job, detail) : job) : [detail, ...current]);
    } catch (error) {
      if (requestID !== jobRequestRef.current) return;
      message.error(errorMessage(error, "Не удалось загрузить результат job-а."));
    } finally {
      if (requestID === jobRequestRef.current) setJobLoading(false);
    }
  };

  const refreshSelectedJob = useCallback(async () => {
    if (!selectedJob) return;
    const requestID = ++jobRequestRef.current;
    const jobID = selectedJob.id;
    setReconciling(false);
    setJobLoading(true);
    try {
      const detail = await fetchNetworkJob(jobID);
      if (requestID !== jobRequestRef.current) return;
      setSelectedJob(detail);
      setJobs((current) => current.map((job) => job.id === detail.id ? updateJobSummary(job, detail) : job));
    } catch (error) {
      if (requestID !== jobRequestRef.current) return;
      message.error(errorMessage(error, "Не удалось обновить job."));
    } finally {
      if (requestID === jobRequestRef.current) setJobLoading(false);
    }
  }, [selectedJob]);

  useEffect(() => {
    if (!selectedJob || jobLoading) return;
    const summary = jobs.find((job) => job.id === selectedJob.id);
    if (!summary) return;
    const changed = summary.state !== selectedJob.state
      || summary.cancel_requested !== selectedJob.cancel_requested
      || summary.completed_at !== selectedJob.completed_at
      || summary.archived !== selectedJob.archived
      || progressMarker(summary.progress) !== progressMarker(selectedJob.progress);
    if (changed) void refreshSelectedJob();
  }, [jobLoading, jobs, refreshSelectedJob, selectedJob]);

  useEffect(() => {
    if (historyTab !== "audit" || !auditLoaded || !auditAutoRefresh || auditLoading) return;
    const poll = window.setInterval(() => {
      if (!auditLoadingRef.current) void refreshAudit();
    }, JOB_POLL_MS);
    return () => window.clearInterval(poll);
  }, [auditAutoRefresh, auditLoaded, auditLoading, historyTab, refreshAudit]);

  const cancelSelectedJob = async () => {
    if (!selectedJob || selectedJob.cancel_requested) return;
    const requestID = ++jobRequestRef.current;
    const jobID = selectedJob.id;
    setReconciling(false);
    try {
      const updated = await cancelNetworkJob(jobID);
      if (requestID !== jobRequestRef.current) return;
      ++jobRequestRef.current;
      setSelectedJob(updated);
      setJobs((current) => current.map((job) => job.id === updated.id ? updateJobSummary(job, updated) : job));
      setJobLoading(false);
      message.success("Запрос на отмену отправлен");
    } catch (error) {
      if (requestID !== jobRequestRef.current) return;
      setJobLoading(false);
      message.error(errorMessage(error, "Не удалось отменить job."));
    }
  };

  const reconcileSelectedJob = async () => {
    if (!selectedJob || !isWorkflowOperationAction(selectedJob.request.action) || reconciling) return;
    const operationID = selectedJob.id;
    const requestID = ++jobRequestRef.current;
    setReconciling(true);
    setJobLoading(false);
    try {
      const job = await submitNetworkJob({
        node_id: selectedJob.request.node_id,
        action: WORKFLOW_RECONCILE_ACTION,
        args: { operation_id: operationID },
        idempotency_key: createIdempotencyKey(),
        timeout_seconds: DEFAULT_TIMEOUT,
      });
      if (requestID !== jobRequestRef.current) return;
      setJobs((current) => [job, ...current.filter((item) => item.id !== job.id)]);
      setSelectedJob(job);
      setReconciling(false);
      setJobLoading(false);
      message.success(`Сверка ${job.id.slice(0, 8)} отправлена`);
    } catch (error) {
      if (requestID !== jobRequestRef.current) return;
      setReconciling(false);
      setJobLoading(false);
      message.error(errorMessage(error, "Не удалось запустить сверку результата."));
    }
  };

  const executeRequest = async (request: SubmitNetworkJobRequest) => {
    const requestID = ++jobRequestRef.current;
    const submitID = ++submitRequestRef.current;
    setSubmitting(true);
    requestKeyRef.current = request.idempotency_key;
    try {
      const job = await submitNetworkJob(request);
      setJobs((current) => [job, ...current.filter((item) => item.id !== job.id)]);
      if (submitID === submitRequestRef.current) {
        requestKeyRef.current = null;
        setRetryRequest(null);
      }
      if (requestID !== jobRequestRef.current) return;
      setSelectedJob(job);
      setReconciling(false);
      setJobLoading(false);
      message.success(`Job ${job.id.slice(0, 8)} отправлена`);
    } catch (error) {
      if (submitID === submitRequestRef.current) setRetryRequest(request);
      if (requestID !== jobRequestRef.current) return;
      message.error(errorMessage(error, "Не удалось отправить job. Ключ idempotency сохранён для повтора."));
    } finally {
      if (submitID === submitRequestRef.current) setSubmitting(false);
    }
  };

  const submitAction = async () => {
    if (!selectedNode || !selectedAction || submitting) return;
    let args: unknown;
    try {
      args = JSON.parse(argsText);
    } catch {
      message.error("Аргументы должны быть корректным JSON.");
      return;
    }
    if (!isRecord(args)) {
      message.error("Корень аргументов должен быть JSON-объектом.");
      return;
    }
    const request: SubmitNetworkJobRequest = {
      node_id: selectedNode.id,
      action: selectedAction.name,
      args,
      idempotency_key: requestKeyRef.current ?? createIdempotencyKey(),
      timeout_seconds: Math.max(1, Math.min(MAX_TIMEOUT, Number(timeoutSeconds) || DEFAULT_TIMEOUT)),
    };
    if (selectedAction.mutating) {
      setMutatingRequest({ request, actionName: selectedAction.name, nodeName: selectedNode.name });
      return;
    }
    await executeRequest(request);
  };

  const disableNode = (node: NetworkNode) => {
    Modal.confirm({
      title: node.disabled ? `Включить ${node.name}?` : `Отключить ${node.name}?`,
      content: node.disabled ? "Агент снова сможет принимать job-ы." : "Новые job-ы для узла будут заблокированы.",
      okText: node.disabled ? "Включить" : "Отключить",
      okType: node.disabled ? "primary" : "danger",
      cancelText: "Отмена",
      onOk: async () => {
        try {
          const updated = await setNetworkNodeDisabled(node.id, !node.disabled);
          setNodes((current) => current.map((item) => item.id === updated.id ? normalizeNode(updated) : item));
          message.success(updated.disabled ? "Узел отключён" : "Узел включён");
        } catch (error) {
          message.error(errorMessage(error, "Не удалось изменить состояние узла."));
        }
      },
    });
  };

  const openEnrollment = () => {
    setEnrollmentName("");
    setEnrollmentNodeId("");
    setEnrollmentOpen(true);
  };

  const enroll = async () => {
    const nodeId = enrollmentNodeId.trim();
    if (!enrollmentName.trim() || !isValidNodeId(nodeId) || enrollmentLoading) {
      if (nodeId && !isValidNodeId(nodeId)) message.error("node_id: 1–64 символа, только латиница, цифры, _, ., -; первый символ — буква или цифра.");
      return;
    }
    setEnrollmentLoading(true);
    try {
      const token = await enrollNetworkNode({ name: enrollmentName.trim(), node_id: nodeId });
      setEnrollmentOpen(false);
      setEnrollmentToken(token);
      message.success("Одноразовый токен выпущен");
    } catch (error) {
      message.error(errorMessage(error, "Не удалось выпустить токен enrollment."));
    } finally {
      setEnrollmentLoading(false);
    }
  };

  const openCredential = () => {
    setCredentialName("");
    setCredentialNodes(selectedNode ? [selectedNode.id] : []);
    setCredentialScopes(["read"]);
    setCredentialOpen(true);
  };

  const createCredential = async () => {
    const body: CreateCredentialRequest = {
      name: credentialName.trim(),
      nodes: credentialNodes,
      scopes: Array.from(new Set(["read", ...credentialScopes])),
    };
    if (!body.name || body.nodes.length === 0 || body.scopes.length === 0 || credentialLoading) return;
    setCredentialLoading(true);
    try {
      const created = await createNetworkCredential(body);
      setCredentials((current) => [created.credential, ...current]);
      setCredentialOpen(false);
      setCredentialToken(created.token);
      message.success("Credential создана");
    } catch (error) {
      message.error(errorMessage(error, "Не удалось создать credential."));
    } finally {
      setCredentialLoading(false);
    }
  };

  const revokeCredential = async (credential: NetworkPrincipal) => {
    try {
      await revokeNetworkCredential(credential.id);
      setCredentials((current) => current.filter((item) => item.id !== credential.id));
      message.success("Credential отозвана");
    } catch (error) {
      message.error(errorMessage(error, "Не удалось отозвать credential."));
    }
  };

  const changeAuditDraftFilter = (field: keyof AuditFilters, value: string) => {
    setAuditDraftFilters((current) => ({ ...current, [field]: value }));
  };

  const changeHistoryTab = (key: string) => {
    setHistoryTab(key);
    if (key === "audit" && !auditLoaded) void loadAudit(auditFilters);
  };

  return (
    <PageLayout
      title="Server Gateway"
      subtitle="Админский шлюз для SSH и MCP операций по узлам RCNet"
      actions={<Button data-testid="network-refresh" icon={<ReloadOutlined />} onClick={() => { void loadWorkspace(); void loadCredentials(); void loadDoctor(); }}>Обновить</Button>}
    >
      {loadError ? <Alert type="error" showIcon icon={<ExclamationCircleOutlined />} message={loadError} action={<Button size="small" onClick={() => { void loadWorkspace(); }}>Повторить</Button>} /> : null}

      <div className="network-status-strip" aria-label="Состояние узлов">
        <div className="network-status-strip__lead"><CloudServerOutlined /><span>RCNet</span><small>{nodes.length ? "gateway подключён" : "ожидает конфигурации"}</small></div>
        <div className="network-status-strip__metric network-status-strip__metric--online"><strong>{onlineCount}</strong><span>онлайн</span></div>
        <div className="network-status-strip__metric network-status-strip__metric--offline"><strong>{offlineCount}</strong><span>офлайн</span></div>
        <div className="network-status-strip__metric"><strong>{disabledCount}</strong><span>отключено</span></div>
        <div className="network-status-strip__metric"><strong>{jobs.length}</strong><span>job-ов</span></div>
      </div>

      <AppPanel className="network-panel network-doctor-panel" title="Диагностика gateway и узлов">
        <NetworkDoctor report={doctorReport} loading={doctorLoading} error={doctorError} onRefresh={() => void loadDoctor()} />
      </AppPanel>

      <div className="network-console">
        <AppPanel className="network-panel network-nodes-panel" title={`Узлы · ${nodes.length}`}>
          <Input.Search allowClear placeholder="Поиск по имени, hostname, label" value={nodeSearch} onChange={(event) => setNodeSearch(event.target.value)} />
          {nodesError ? <Alert className="network-inline-alert" type="warning" showIcon message={nodesError} /> : null}
          <div className="network-node-list">
            {loading ? <div className="network-panel-loading"><Spin /></div> : filteredNodes.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={nodes.length ? "Ничего не найдено" : "Узлы ещё не зарегистрированы"} /> : filteredNodes.map((node) => {
              const selected = node.id === selectedNodeId;
              return (
                <button type="button" key={node.id} className={selected ? "network-node network-node--selected" : "network-node"} onClick={() => setSelectedNodeId(node.id)}>
                  <span className="network-node__dot" data-status={nodeStatus(node, now)} />
                  <span className="network-node__body"><strong>{node.name}</strong><small>{node.hostname} · {node.os}/{node.arch}</small></span>
                  <NodeStatusTag node={node} now={now} />
                </button>
              );
            })}
          </div>
          <Button block icon={<KeyOutlined />} aria-label="Подключить узел" data-testid="network-enroll" onClick={openEnrollment}>Подключить узел</Button>
        </AppPanel>

        <div className="network-console__main">
          <AppPanel className="network-panel network-runner-panel" title="Выполнить действие">
            {selectedNode ? (
              <div className="network-selected-node">
                <div><span className="network-eyebrow">Целевой узел</span><strong>{selectedNode.name}</strong><small>{selectedNode.hostname} · {relativeTime(selectedNode.last_seen, now)}</small></div>
                <Space>
                  <NodeStatusTag node={selectedNode} now={now} />
                  <Button size="small" icon={selectedNode.disabled ? <UnlockOutlined /> : <LockOutlined />} onClick={() => disableNode(selectedNode)}>{selectedNode.disabled ? "Включить" : "Отключить"}</Button>
                </Space>
                <div className="network-node-capabilities">
                  <div><span>roots</span><strong>{selectedNode.roots.length ? selectedNode.roots.join(", ") : "—"}</strong></div>
                  <div><span>runtimes</span><strong>{selectedNode.runtimes.length ? selectedNode.runtimes.join(", ") : "—"}</strong></div>
                  <div><span>actions</span><strong>{selectedNode.actions.length ? selectedNode.actions.join(", ") : "—"}</strong></div>
                </div>
              </div>
            ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Выберите узел для выполнения действия" />}
            <div className="network-action-picker">
              <Input.Search allowClear placeholder="Поиск в каталоге действий" value={actionSearch} onChange={(event) => setActionSearch(event.target.value)} />
              <div className="network-action-list">
                {loading ? <div className="network-panel-loading"><Spin /></div> : filteredActions.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={!selectedNode ? "Выберите узел для просмотра доступных действий" : availableActions.length ? "Ничего не найдено" : "Узел не объявил доступных действий"} /> : filteredActions.map((action) => {
                  const selected = action.name === selectedActionName;
                  return <button type="button" key={action.name} className={selected ? "network-action network-action--selected" : "network-action"} onClick={() => setSelectedActionName(action.name)}><span className="network-action__name"><code>{action.name}</code>{action.mutating ? <Tag color="error">mutating</Tag> : <Tag color="success">read</Tag>}</span><small>{action.description || "Без описания"} · scope: {action.scope}</small></button>;
                })}
              </div>
            </div>
            {selectedAction ? (
              <div className="network-action-form">
                <div className="network-form-heading"><div><span className="network-eyebrow">JSON arguments</span><strong>{selectedAction.name}</strong></div>{selectedAction.input_schema ? <Tag icon={<CodeOutlined />}>schema доступна</Tag> : null}</div>
                <Input.TextArea aria-label="JSON arguments" className="network-json-input" value={argsText} onChange={(event) => setArgsText(event.target.value)} autoSize={{ minRows: 5, maxRows: 12 }} spellCheck={false} />
                <div className="network-action-form__footer">
                  <label>Timeout, сек. <Input type="number" min={1} max={MAX_TIMEOUT} value={timeoutSeconds} onChange={(event) => setTimeoutSeconds(Number(event.target.value))} /></label>
                  <Space>
                    {retryRequest ? <Button data-testid="network-retry" icon={<SyncOutlined />} onClick={() => void executeRequest(retryRequest)} disabled={submitting}>Повторить последний</Button> : null}
                    <Button data-testid="network-submit" type="primary" icon={<SendOutlined />} onClick={() => void submitAction()} loading={submitting} disabled={!selectedNode || selectedNode.disabled}>{selectedAction.mutating ? "Подтвердить и выполнить" : "Выполнить"}</Button>
                  </Space>
                </div>
                {selectedAction.input_schema ? <details className="network-schema"><summary>Показать input schema</summary><pre>{jsonText(selectedAction.input_schema)}</pre></details> : null}
              </div>
            ) : null}
          </AppPanel>

          <AppPanel className="network-panel network-jobs-panel" title="История операций">
            <Tabs
              activeKey={historyTab}
              onChange={changeHistoryTab}
              items={[
                {
                  key: "jobs",
                  label: `Job queue · ${jobs.length}`,
                  children: <>
                    {jobsError ? <Alert className="network-inline-alert" type="warning" showIcon message={jobsError} /> : null}
                    {loading && jobs.length === 0 ? <div className="network-panel-loading"><Spin /></div> : jobs.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Job-ов ещё нет" /> : <List className="network-jobs-list" dataSource={jobs} renderItem={(job) => {
                      const node = nodes.find((item) => item.id === job.request.node_id);
                      return <List.Item actions={[<Button key="open" type="link" onClick={() => void openJob(job)}>Открыть</Button>]}>
                        <List.Item.Meta avatar={<span className="network-job-icon"><CheckCircleOutlined /></span>} title={<span className="network-job-title"><code>{job.request.action}</code><JobStateTag state={job.state} workflowAction={isWorkflowOperationAction(job.request.action) || job.request.action === WORKFLOW_RECONCILE_ACTION} /></span>} description={<span>{node?.name ?? job.request.node_id} · {formatTime(job.created_at)}{job.principal ? ` · ${job.principal}` : ""}</span>} />
                      </List.Item>;
                    }} />}
                  </>,
                },
                {
                  key: "audit",
                  label: "Журнал",
                  children: <AuditPanel
                    events={auditEvents}
                    activity={networkActivity}
                    activityLoading={activityLoading}
                    activityError={activityError}
                    activityWindow={activityWindow}
                    filters={auditDraftFilters}
                    loading={auditLoading}
                    error={auditError}
                    hasPrevious={auditBeforeHistory.length > 0}
                    hasNext={Boolean(auditNextCursor)}
                    autoRefresh={auditAutoRefresh}
                    onFilterChange={changeAuditDraftFilter}
                    onApply={() => void applyAuditFilters()}
                    onReset={() => void resetAuditFilters()}
                    onRefresh={() => void refreshAudit()}
                    onPrevious={() => void loadPreviousAuditPage()}
                    onNext={() => void loadNextAuditPage()}
                    onAutoRefreshChange={setAuditAutoRefresh}
                    onActivityWindowChange={changeActivityWindow}
                    onOpenJob={(jobID) => void openJobById(jobID)}
                  />,
                },
              ]}
            />
          </AppPanel>
        </div>
      </div>

      <AppPanel className="network-panel network-credentials-panel" title="Доступы агентов">
        <div className="network-credentials-toolbar"><Typography.Text type="secondary">Scoped credentials для CLI/MCP. В списке токены никогда не показываются.</Typography.Text><Button data-testid="network-create-credential" type="primary" icon={<KeyOutlined />} onClick={openCredential}>Создать credential</Button></div>
        {credentialsError ? <Alert type="warning" showIcon message={credentialsError} action={<Button size="small" onClick={() => void loadCredentials()}>Повторить</Button>} /> : null}
        {credentialsLoading ? <div className="network-panel-loading"><Spin /></div> : credentials.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Scoped credentials ещё не созданы" /> : <div className="network-credentials-list">{credentials.map((credential) => <div className="network-credential" key={credential.id}><div><strong>{credential.name}</strong><small>{credential.nodes.join(", ")} · создана {formatTime(credential.created_at)}</small></div><div className="network-credential__scopes">{credential.scopes.map((scope) => <Tag key={scope}>{scope}</Tag>)}</div><Popconfirm title="Отозвать credential?" description="Агент потеряет доступ сразу после ответа gateway." okText="Отозвать" cancelText="Отмена" onConfirm={() => void revokeCredential(credential)}><Button danger type="text" icon={<DeleteOutlined />} aria-label={`Отозвать ${credential.name}`} /></Popconfirm></div>)}</div>}
      </AppPanel>

      <Modal open={enrollmentOpen} title="Подключить узел" onCancel={() => setEnrollmentOpen(false)} onOk={() => void enroll()} okText="Выпустить одноразовый токен" cancelText="Отмена" confirmLoading={enrollmentLoading} okButtonProps={{ disabled: !enrollmentName.trim() || !isValidNodeId(enrollmentNodeId.trim()), "data-testid": "network-enrollment-submit" }} destroyOnHidden>
        <div className="network-modal-form"><Alert type="info" showIcon message="Укажите новый node_id. Он должен быть ещё не зарегистрирован в gateway; токен enrollment действует один раз и не хранится в браузере." /><label>Имя агента<Input value={enrollmentName} onChange={(event) => setEnrollmentName(event.target.value)} placeholder="например, velocity-prod" autoFocus /></label><label>Новый node_id<Input value={enrollmentNodeId} onChange={(event) => setEnrollmentNodeId(event.target.value)} placeholder="например, velocity-prod-01" maxLength={64} status={enrollmentNodeId && !isValidNodeId(enrollmentNodeId) ? "error" : undefined} /><Typography.Text type="secondary">1–64 символа: A–Z, a–z, 0–9, _, ., -. Первый символ — буква или цифра.</Typography.Text></label></div>
      </Modal>

      <Modal open={credentialOpen} title="Создать scoped credential" onCancel={() => setCredentialOpen(false)} onOk={() => void createCredential()} okText="Создать и показать токен" cancelText="Отмена" confirmLoading={credentialLoading} okButtonProps={{ disabled: !credentialName.trim() || credentialNodes.length === 0 || credentialScopes.length === 0, "data-testid": "network-credential-submit" }} destroyOnHidden>
        <div className="network-modal-form"><label>Название credential<Input value={credentialName} onChange={(event) => setCredentialName(event.target.value)} placeholder="например, deploy-bot" autoFocus /></label><label>Узлы<Select mode="multiple" value={credentialNodes} onChange={setCredentialNodes} options={[{ value: "*", label: "Все узлы (*) — явно" }, ...nodes.map((node) => ({ value: node.id, label: `${node.name} · ${node.hostname}` }))]} placeholder="Выберите точные id или *" /></label><label>Scopes<Checkbox.Group value={credentialScopes} onChange={(value) => setCredentialScopes(Array.from(new Set(["read", ...value.map(String)])))} options={SCOPES.map((scope) => ({ label: SCOPE_LABELS[scope], value: scope, disabled: scope === "read" }))} /></label><Typography.Paragraph type="secondary">read обязателен для диагностики и остаётся включённым. Добавьте exec для команд, write для файлов, control для сервисов; admin выдаёт управление доступами и требует отдельного решения.</Typography.Paragraph></div>
      </Modal>

      <Modal
        open={Boolean(mutatingRequest)}
        title="Подтвердить mutating action?"
        onCancel={() => setMutatingRequest(null)}
        onOk={async () => {
          if (!mutatingRequest) return;
          const pending = mutatingRequest;
          await executeRequest(pending.request);
          setMutatingRequest(null);
        }}
        okText="Выполнить"
        okType="danger"
        cancelText="Отмена"
        confirmLoading={submitting}
        destroyOnHidden
      >
        {mutatingRequest ? `«${mutatingRequest.actionName}» изменит состояние узла ${mutatingRequest.nodeName}. Запрос уйдёт с текущими JSON-аргументами.` : null}
      </Modal>

      <SecretTokenModal token={enrollmentToken?.token ?? null} title="Токен enrollment" command="rcnet enroll --config /private/path/node.json --enrollment-token-file /private/path/enrollment.token" instructions="Скопируйте токен в /private/path/enrollment.token, выставьте права 0600 и передайте этот файл команде rcnet enroll." onClose={() => setEnrollmentToken(null)} />
      <SecretTokenModal token={credentialToken} title="Токен credential" command="RCNET_URL=https://utils.alexeyav.ru/api/network RCNET_TOKEN_FILE=/private/path/agent.token" instructions="Скопируйте токен в /private/path/agent.token с правами 0600. Передавайте путь через RCNET_TOKEN_FILE; не вставляйте значение токена в команду." onClose={() => setCredentialToken(null)} />
      <JobResultDrawer
        job={selectedJob}
        loading={jobLoading}
        reconciling={reconciling}
        onClose={() => { ++jobRequestRef.current; setSelectedJob(null); setJobLoading(false); setReconciling(false); }}
        onRefresh={() => void refreshSelectedJob()}
        onCancel={() => void cancelSelectedJob()}
        onReconcile={() => void reconcileSelectedJob()}
      />
    </PageLayout>
  );
}
