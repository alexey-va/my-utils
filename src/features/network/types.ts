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
