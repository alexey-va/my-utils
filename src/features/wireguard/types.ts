export type WireGuardRelayStatus = "WAITING_FOR_AGENT" | "SYNCING" | "READY" | "STALE";

export type WireGuardRelay = {
  id: string;
  name: string;
  publicEndpoint: string;
  clientCidr: string;
  clientDns: string;
  interfaceName: string;
  serverPublicKey: string | null;
  desiredRevision: number;
  appliedRevision: number | null;
  status: WireGuardRelayStatus;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreatedWireGuardRelay = WireGuardRelay & { agentToken: string };
export type WireGuardAgentToken = { agentToken: string };

export type WireGuardPeer = {
  id: string;
  name: string;
  publicKey: string;
  assignedIp: string;
  enabled: boolean;
  latestHandshakeAt: string | null;
  totalReceiveBytes: number;
  totalTransmitBytes: number;
  metricsUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WireGuardPeerCredentials = {
  peer: WireGuardPeer;
  clientConfig: string;
  fileName: string;
};

export type CreateWireGuardRelay = {
  name: string;
  publicEndpoint: string;
  clientCidr: string;
  clientDns: string;
};
