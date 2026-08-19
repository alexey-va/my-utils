/**
 * Backend route paths (relative to `VITE_API_BASE_URL` or same-origin `/api` via Vite proxy).
 */
export const apiEndpoints = {
  health: "/api/health",
  healthSteps: "/api/health/steps",
  healthWeight: "/api/health/weight",
  auth: {
    login: "/api/auth/login",
    register: "/api/auth/register",
    logout: "/api/auth/logout",
    me: "/api/auth/me",
    credentials: "/api/auth/credentials",
  },
  admin: {
    settings: "/api/admin/settings",
    setting: (key: string) => `/api/admin/settings/${encodeURIComponent(key)}`,
    agentTestChats: "/api/admin/agent-test-chats",
    agentTestChat: (id: string) =>
      `/api/admin/agent-test-chats/${encodeURIComponent(id)}`,
    agentTestChatMessages: (id: string) =>
      `/api/admin/agent-test-chats/${encodeURIComponent(id)}/messages`,
    wireguardRelays: "/api/admin/wireguard/relays",
    wireguardRelay: (relayId: string) =>
      `/api/admin/wireguard/relays/${encodeURIComponent(relayId)}`,
    wireguardRelayToken: (relayId: string) =>
      `/api/admin/wireguard/relays/${encodeURIComponent(relayId)}/rotate-token`,
    wireguardPeers: (relayId: string) =>
      `/api/admin/wireguard/relays/${encodeURIComponent(relayId)}/peers`,
    wireguardPeer: (relayId: string, peerId: string) =>
      `/api/admin/wireguard/relays/${encodeURIComponent(relayId)}/peers/${encodeURIComponent(peerId)}`,
    wireguardPeerCredentials: (relayId: string, peerId: string) =>
      `/api/admin/wireguard/relays/${encodeURIComponent(relayId)}/peers/${encodeURIComponent(peerId)}/credentials`,
  },
  workouts: {
    exercises: "/api/workouts/exercises",
    exerciseProgress: (id: string) => `/api/workouts/exercises/${id}/progress`,
    exercise: (id: string) => `/api/workouts/exercises/${id}`,
    entry: (exerciseId: string, performedOn: string) =>
      `/api/workouts/exercises/${exerciseId}/entries/${performedOn}`,
    grid: "/api/workouts/grid",
    entries: "/api/workouts/entries",
    moveEntry: "/api/workouts/entries/move",
  },
} as const;
