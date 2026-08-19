export type WireGuardRelayStatus = "WAITING_FOR_AGENT" | "SYNCING" | "READY" | "STALE";
export type WireGuardRoutingMode = "AWG_ONLY" | "RU_DIRECT_AWG_DEFAULT";

export type WireGuardRouteProbe = {
  target: string;
  packetLossPercent: number;
  averageRttMs: number | null;
};

export type WireGuardRouteQuality = {
  measuredAt: string;
  direct: WireGuardRouteProbe;
  veesp: WireGuardRouteProbe;
};

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
  routingMode: WireGuardRoutingMode;
  ruPrefixCount: number;
  routingUpdatedAt: string | null;
  routeQuality: WireGuardRouteQuality | null;
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

export type WireGuardPeerMetricsRange = "HOUR" | "DAY" | "WEEK" | "MONTH";

export type WireGuardPeerMetricPoint = {
  bucketStart: string;
  downloadBytes: number;
  uploadBytes: number;
  ruDownloadBytes: number;
  ruUploadBytes: number;
  nonRuDownloadBytes: number;
  nonRuUploadBytes: number;
};

export type WireGuardPeerMetrics = {
  peerId: string;
  range: WireGuardPeerMetricsRange;
  from: string;
  to: string;
  points: WireGuardPeerMetricPoint[];
};
