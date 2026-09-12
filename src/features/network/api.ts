import { apiClient } from "../../api/client";
import { apiEndpoints } from "../../api/endpoints";
import type {
  ActionsResponse,
  CreateCredentialRequest,
  CreatedCredential,
  CredentialsResponse,
  EnrollmentToken,
  EnrollNodeRequest,
  JobsResponse,
  NetworkJob,
  NetworkNode,
  NetworkAuditQuery,
  NetworkAuditResponse,
  NetworkActivity,
  NetworkActivityQuery,
  NetworkDoctorReport,
  NodesResponse,
  SubmitNetworkJobRequest,
} from "./types";

export const fetchNetworkNodes = () =>
  apiClient.get<NodesResponse>(apiEndpoints.admin.network.nodes, { cache: "no-store" });

export const fetchNetworkActions = () =>
  apiClient.get<ActionsResponse>(apiEndpoints.admin.network.actions, { cache: "no-store" });

export const fetchNetworkJobs = () =>
  apiClient.get<JobsResponse>(apiEndpoints.admin.network.jobs, { cache: "no-store" });

export const fetchNetworkJob = (id: string) =>
  apiClient.get<NetworkJob>(apiEndpoints.admin.network.job(id), { cache: "no-store" });

export const submitNetworkJob = (body: SubmitNetworkJobRequest) =>
  apiClient.post<NetworkJob>(apiEndpoints.admin.network.jobs, body);

export const cancelNetworkJob = (id: string) =>
  apiClient.post<NetworkJob>(apiEndpoints.admin.network.cancelJob(id));

export const enrollNetworkNode = (body: EnrollNodeRequest) =>
  apiClient.post<EnrollmentToken>(apiEndpoints.admin.network.enrollments, body);

export const fetchNetworkCredentials = () =>
  apiClient.get<CredentialsResponse>(apiEndpoints.admin.network.credentials, { cache: "no-store" });

export const createNetworkCredential = (body: CreateCredentialRequest) =>
  apiClient.post<CreatedCredential>(apiEndpoints.admin.network.credentials, body);

export const revokeNetworkCredential = (id: string) =>
  apiClient.delete<void>(apiEndpoints.admin.network.credential(id));

export const setNetworkNodeDisabled = (id: string, disabled: boolean) =>
  apiClient.post<NetworkNode>(apiEndpoints.admin.network.disableNode(id), { disabled });

export const fetchNetworkAudit = (query: NetworkAuditQuery = {}) => {
  const params = new URLSearchParams();
  if (query.node) params.set("node", query.node);
  if (query.action) params.set("action", query.action);
  if (query.kind) params.set("kind", query.kind);
  if (query.actor) params.set("actor", query.actor);
  if (query.before) params.set("before", query.before);
  if (query.limit !== undefined) params.set("limit", String(Math.max(1, Math.min(200, Math.trunc(query.limit)))));
  const suffix = params.toString();
  return apiClient.get<NetworkAuditResponse>(`${apiEndpoints.network.audit}${suffix ? `?${suffix}` : ""}`, { cache: "no-store" });
};

export const fetchNetworkActivity = (query: NetworkActivityQuery) => {
  const params = new URLSearchParams({ window: query.window });
  if (query.node) params.set("node", query.node);
  if (query.action) params.set("action", query.action);
  if (query.actor) params.set("actor", query.actor);
  return apiClient.get<NetworkActivity>(`${apiEndpoints.admin.network.activity}?${params.toString()}`, { cache: "no-store" });
};

export const fetchNetworkDoctor = () =>
  apiClient.get<NetworkDoctorReport>(apiEndpoints.admin.network.doctor, { cache: "no-store" });
