export type WireGuardRelayStatus = "WAITING_FOR_AGENT" | "SYNCING" | "READY" | "DEGRADED" | "DOWN" | "STALE";
export type WireGuardRoutingMode = "AWG_ONLY" | "RU_DIRECT_AWG_DEFAULT";
export type WireGuardExitId = "primary" | "secondary";
export type WireGuardExitPreference = "AUTO" | "PRIMARY" | "SECONDARY";

export type WireGuardExitProbeHealth = {
  id: WireGuardExitId;
  interface: string;
  healthy: boolean;
  reason: string | null;
  expectedEgressIp: string;
  observedEgressIp: string | null;
  handshakeAtEpoch: number;
  handshakeAgeSeconds: number | null;
  latencyMs: number | null;
};

export type WireGuardExitHealth = {
  schemaVersion: 1;
  checkedAt: string;
  overallStatus: "HEALTHY" | "DEGRADED" | "DOWN";
  activeExit: WireGuardExitId | null;
  activeInterface: string | null;
  changed: boolean;
  counters: Record<WireGuardExitId, { successes: number; failures: number }>;
  exits: Record<WireGuardExitId, WireGuardExitProbeHealth>;
};

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
  routingHealthy: boolean | null;
  routingCheckedAt: string | null;
  routeQuality: WireGuardRouteQuality | null;
  exitHealth: WireGuardExitHealth | null;
  exitPreference: WireGuardExitPreference;
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
  currentDownloadBytesPerSecond: number;
  currentUploadBytesPerSecond: number;
  metricsUpdatedAt: string | null;
  traffic: WireGuardPeriodTraffic;
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

export type WireGuardTrafficTotals = {
  downloadBytes: number;
  uploadBytes: number;
  ruDownloadBytes: number;
  ruUploadBytes: number;
  nonRuDownloadBytes: number;
  nonRuUploadBytes: number;
};

export type WireGuardPeriodTraffic = WireGuardTrafficTotals & {
  range: WireGuardPeerMetricsRange;
  from: string;
  to: string;
};

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
  summary: WireGuardTrafficTotals;
  points: WireGuardPeerMetricPoint[];
};

export type WireGuardExitHealthMetricPoint = {
  bucketStart: string;
  primaryAvailabilityPercent: number;
  secondaryAvailabilityPercent: number;
  primaryAverageLatencyMs: number | null;
  secondaryAverageLatencyMs: number | null;
  primaryFailureReason: string | null;
  secondaryFailureReason: string | null;
  activeExit: WireGuardExitId | null;
  overallStatus: "HEALTHY" | "DEGRADED" | "DOWN";
  samples: number;
};

export type WireGuardExitHealthHistory = {
  range: WireGuardPeerMetricsRange;
  from: string;
  to: string;
  points: WireGuardExitHealthMetricPoint[];
};

export type WireGuardSnapshot = {
  relay: WireGuardRelay;
  peers: WireGuardPeer[];
  peerMetrics: Record<string, WireGuardPeerMetrics>;
  exitHealthHistory: WireGuardExitHealthHistory;
};
