export type NetworkNode = {
  id: string;
  name: string;
  os: string;
  arch: string;
  hostname: string;
  version: string;
  last_seen: string | null;
  roots: string[];
  runtimes: string[];
  actions: string[];
  labels: Record<string, string>;
  disabled: boolean;
  diagnostics?: NetworkNodeDiagnostics | null;
};

export type NetworkBuildInfo = {
  revision: string;
  go_version: string;
  executable_sha256?: string;
  workflow_sha256?: string;
};

export type NetworkNodeDiagnostics = {
  build: NetworkBuildInfo;
  config_sha256: string;
  workflow_sha256?: string;
};

export type NetworkDoctorIssue = {
  code: string;
  severity: string;
  message: string;
};

export type NetworkDoctorNode = {
  node: NetworkNode;
  issues: NetworkDoctorIssue[];
};

export type NetworkDoctorReport = {
  checked_at: string;
  protocol: string;
  gateway: NetworkBuildInfo;
  client?: NetworkBuildInfo | null;
  nodes: NetworkDoctorNode[];
  issues: NetworkDoctorIssue[];
};

export type NetworkAction = {
  name: string;
  description: string;
  mutating: boolean;
  scope: string;
  /** Optional JSON-schema-like description supplied by newer gateways. */
  input_schema?: Record<string, unknown>;
};

export type NetworkJobResult = {
  ok: boolean;
  data?: unknown;
  stdout?: string;
  stderr?: string;
  exit_code?: number | null;
  error?: string;
  truncated?: boolean;
};

export type NetworkWorkflowFileEvidence = {
  runtime?: string;
  path?: string;
  expected_sha256?: string;
  actual_sha256?: string;
  status?: string;
};

export type NetworkWorkflowResultData = {
  operation_id?: string;
  checked_at?: string;
  delivery?: string;
  activation?: string;
  files?: NetworkWorkflowFileEvidence[];
  runtime?: unknown;
  record?: Record<string, unknown>;
  next_steps?: string[];
  cancellation_boundary?: string;
};

export type NetworkJobProgress = {
  sequence: number;
  at: string;
  phase: string;
  status: string;
  target?: string | null;
  message?: string | null;
};

export type NetworkJobState =
  | "queued"
  | "dispatched"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "unknown";

export type NetworkJobRequest = {
  node_id: string;
  action: string;
  /** Job list responses may omit args; detail responses include them. */
  args?: Record<string, unknown>;
  idempotency_key: string;
  timeout_seconds: number;
};

export type SubmitNetworkJobRequest = Omit<NetworkJobRequest, "args"> & {
  args: Record<string, unknown>;
};

export type NetworkJob = {
  id: string;
  request: NetworkJobRequest;
  /** Older completed jobs may retain only metadata after the history limit. */
  archived?: boolean;
  principal: string;
  state: NetworkJobState;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  cancel_requested: boolean;
  result?: NetworkJobResult;
  /** Newer gateways expose the latest workflow progress on both list and detail responses. */
  progress?: NetworkJobProgress | null;
  /** Detail responses may include a bounded, ordered workflow progress timeline. */
  events?: NetworkJobProgress[] | null;
};

export type NetworkPrincipal = {
  id: string;
  name: string;
  nodes: string[];
  scopes: string[];
  disabled: boolean;
  created_at: string;
};

export type NodesResponse = { nodes: NetworkNode[] };
export type ActionsResponse = { actions: NetworkAction[] };
export type JobsResponse = { jobs: NetworkJob[] };
export type CredentialsResponse = { credentials: NetworkPrincipal[] };

export type EnrollNodeRequest = {
  name: string;
  node_id: string;
};

export type EnrollmentToken = EnrollNodeRequest & {
  token: string;
  expires_at: string;
};

export type CreateCredentialRequest = {
  name: string;
  nodes: string[];
  scopes: string[];
};

export type CreatedCredential = {
  credential: NetworkPrincipal;
  token: string;
};

export type NetworkAuditActor = {
  id: string;
  name: string;
  source: string;
  credential_id?: string;
  credential_name?: string;
};

export type NetworkAuditEvent = {
  id: string;
  timestamp: string;
  kind: string;
  actor: NetworkAuditActor;
  node_id?: string;
  action?: string;
  job_id?: string;
  state?: string;
  parameters?: Record<string, string>;
  message?: string;
  exit_code?: number;
};

export type NetworkAuditQuery = {
  node?: string;
  action?: string;
  kind?: string;
  actor?: string;
  before?: string;
  limit?: number;
};

export type NetworkAuditResponse = {
  events: NetworkAuditEvent[];
  next_cursor?: string;
};

export type NetworkActivityWindow = "1h" | "24h" | "7d";

export type NetworkActivityQuery = {
  window: NetworkActivityWindow;
  node?: string;
  action?: string;
  actor?: string;
};

export type NetworkActivityLatency = {
  samples: number;
  mean_ms?: number;
  p95_ms?: number;
};

export type NetworkActivitySummary = {
  requests: number;
  succeeded: number;
  failed: number;
  cancelled: number;
  unknown: number;
  pending: number;
  queue_ms: NetworkActivityLatency;
  execution_ms: NetworkActivityLatency;
  transfer_bytes: number;
  transfer_samples: number;
  transfer_unknown: number;
};

export type NetworkActivityBucket = NetworkActivitySummary & {
  start: string;
  end: string;
};

export type NetworkActivityAction = NetworkActivitySummary & {
  action: string;
};

export type NetworkActivityCoverage = {
  retained_jobs: number;
  oldest_job_at?: string;
  archived_in_window: number;
};

export type NetworkActivity = {
  window: NetworkActivityWindow;
  from: string;
  to: string;
  bucket_seconds: number;
  basis: string;
  coverage: NetworkActivityCoverage;
  totals: NetworkActivitySummary;
  buckets: NetworkActivityBucket[];
  actions: NetworkActivityAction[];
};
