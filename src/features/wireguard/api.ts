import { apiClient } from "../../api/client";
import { apiEndpoints } from "../../api/endpoints";
import type {
  CreateWireGuardRelay,
  CreatedWireGuardRelay,
  WireGuardAgentToken,
  WireGuardExitPreference,
  WireGuardPeer,
  WireGuardPeerCredentials,
  WireGuardPeerMetrics,
  WireGuardPeerMetricsRange,
  WireGuardRelay,
  WireGuardSnapshot,
} from "./types";

export const fetchWireGuardRelays = () =>
  apiClient.get<WireGuardRelay[]>(apiEndpoints.admin.wireguardRelays, { cache: "no-store" });

export const createWireGuardRelay = (body: CreateWireGuardRelay) =>
  apiClient.post<CreatedWireGuardRelay>(apiEndpoints.admin.wireguardRelays, body);

export const deleteWireGuardRelay = (relayId: string) =>
  apiClient.delete<void>(apiEndpoints.admin.wireguardRelay(relayId));

export const rotateWireGuardAgentToken = (relayId: string) =>
  apiClient.post<WireGuardAgentToken>(apiEndpoints.admin.wireguardRelayToken(relayId));

export const setWireGuardExitPreference = (relayId: string, preference: WireGuardExitPreference) =>
  apiClient.put<WireGuardRelay>(apiEndpoints.admin.wireguardRelayExitPreference(relayId), { preference });

export const fetchWireGuardSnapshot = (relayId: string, range: WireGuardPeerMetricsRange) =>
  apiClient.get<WireGuardSnapshot>(
    `${apiEndpoints.admin.wireguardSnapshot(relayId)}?range=${range}`,
    { cache: "no-store" },
  );

export const fetchWireGuardPeers = (relayId: string, range: WireGuardPeerMetricsRange) =>
  apiClient.get<WireGuardPeer[]>(
    `${apiEndpoints.admin.wireguardPeers(relayId)}?range=${range}`,
    { cache: "no-store" },
  );

export const fetchWireGuardPeerMetrics = (
  relayId: string,
  peerId: string,
  range: WireGuardPeerMetricsRange,
) =>
  apiClient.get<WireGuardPeerMetrics>(
    `${apiEndpoints.admin.wireguardPeerMetrics(relayId, peerId)}?range=${range}`,
    { cache: "no-store" },
  );

export const createWireGuardPeer = (relayId: string, name: string) =>
  apiClient.post<WireGuardPeerCredentials>(apiEndpoints.admin.wireguardPeers(relayId), { name });

export const fetchWireGuardPeerCredentials = (relayId: string, peerId: string) =>
  apiClient.get<WireGuardPeerCredentials>(
    apiEndpoints.admin.wireguardPeerCredentials(relayId, peerId),
  );

export const setWireGuardPeerEnabled = (relayId: string, peerId: string, enabled: boolean) =>
  apiClient.patch<WireGuardPeer>(apiEndpoints.admin.wireguardPeer(relayId, peerId), { enabled });

export const deleteWireGuardPeer = (relayId: string, peerId: string) =>
  apiClient.delete<void>(apiEndpoints.admin.wireguardPeer(relayId, peerId));
