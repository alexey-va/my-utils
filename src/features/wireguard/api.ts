import { apiClient } from "../../api/client";
import { apiEndpoints } from "../../api/endpoints";
import type {
  CreateWireGuardRelay,
  CreateWireGuardPeer,
  CreatedWireGuardRelay,
  WireGuardAgentToken,
  WireGuardExitPreference,
  WireGuardPeer,
  WireGuardPeerCredentials,
  WireGuardPeerMetrics,
  WireGuardPeerMetricsRange,
  WireGuardPeerCategory,
  WireGuardPeerCategoryOrderItem,
  WireGuardPeerOrderItem,
  WireGuardRelay,
  WireGuardSnapshot,
  UpdateWireGuardPeer,
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

export const createWireGuardPeer = (relayId: string, body: CreateWireGuardPeer) =>
  apiClient.post<WireGuardPeerCredentials>(apiEndpoints.admin.wireguardPeers(relayId), body);

export const fetchWireGuardPeerCredentials = (relayId: string, peerId: string) =>
  apiClient.get<WireGuardPeerCredentials>(
    apiEndpoints.admin.wireguardPeerCredentials(relayId, peerId),
  );

export const updateWireGuardPeer = (relayId: string, peerId: string, body: UpdateWireGuardPeer) =>
  apiClient.patch<WireGuardPeer>(apiEndpoints.admin.wireguardPeer(relayId, peerId), body);

export const setWireGuardPeerEnabled = (relayId: string, peerId: string, enabled: boolean) =>
  updateWireGuardPeer(relayId, peerId, { enabled });

export const reorderWireGuardPeers = (relayId: string, items: WireGuardPeerOrderItem[]) =>
  apiClient.put<void>(apiEndpoints.admin.wireguardPeerOrder(relayId), { items });

export const createWireGuardPeerCategory = (relayId: string, name: string) =>
  apiClient.post<WireGuardPeerCategory>(apiEndpoints.admin.wireguardPeerCategories(relayId), { name });

export const updateWireGuardPeerCategory = (relayId: string, categoryId: string, name: string) =>
  apiClient.patch<WireGuardPeerCategory>(apiEndpoints.admin.wireguardPeerCategory(relayId, categoryId), { name });

export const reorderWireGuardPeerCategories = (
  relayId: string,
  items: WireGuardPeerCategoryOrderItem[],
) => apiClient.put<void>(apiEndpoints.admin.wireguardPeerCategoryOrder(relayId), { items });

export const deleteWireGuardPeerCategory = (relayId: string, categoryId: string) =>
  apiClient.delete<void>(apiEndpoints.admin.wireguardPeerCategory(relayId, categoryId));

export const deleteWireGuardPeer = (relayId: string, peerId: string) =>
  apiClient.delete<void>(apiEndpoints.admin.wireguardPeer(relayId, peerId));
