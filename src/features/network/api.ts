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
