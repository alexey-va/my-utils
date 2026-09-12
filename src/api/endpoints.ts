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
    refresh: "/api/auth/refresh",
    logout: "/api/auth/logout",
    me: "/api/auth/me",
    credentials: "/api/auth/credentials",
  },
  network: {
    audit: "/api/network/v1/audit",
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
    wireguardRelayExitPreference: (relayId: string) =>
      `/api/admin/wireguard/relays/${encodeURIComponent(relayId)}/exit-preference`,
    wireguardSnapshot: (relayId: string) =>
      `/api/admin/wireguard/relays/${encodeURIComponent(relayId)}/snapshot`,
    wireguardPeers: (relayId: string) =>
      `/api/admin/wireguard/relays/${encodeURIComponent(relayId)}/peers`,
    wireguardPeerCategories: (relayId: string) =>
      `/api/admin/wireguard/relays/${encodeURIComponent(relayId)}/categories`,
    wireguardPeerCategoryOrder: (relayId: string) =>
      `/api/admin/wireguard/relays/${encodeURIComponent(relayId)}/categories/order`,
    wireguardPeerCategory: (relayId: string, categoryId: string) =>
      `/api/admin/wireguard/relays/${encodeURIComponent(relayId)}/categories/${encodeURIComponent(categoryId)}`,
    wireguardPeerOrder: (relayId: string) =>
      `/api/admin/wireguard/relays/${encodeURIComponent(relayId)}/peers/order`,
    wireguardPeer: (relayId: string, peerId: string) =>
      `/api/admin/wireguard/relays/${encodeURIComponent(relayId)}/peers/${encodeURIComponent(peerId)}`,
    wireguardPeerCredentials: (relayId: string, peerId: string) =>
      `/api/admin/wireguard/relays/${encodeURIComponent(relayId)}/peers/${encodeURIComponent(peerId)}/credentials`,
    wireguardPeerMetrics: (relayId: string, peerId: string) =>
      `/api/admin/wireguard/relays/${encodeURIComponent(relayId)}/peers/${encodeURIComponent(peerId)}/metrics`,
    network: {
      nodes: "/api/admin/network/v1/nodes",
      actions: "/api/admin/network/v1/actions",
      jobs: "/api/admin/network/v1/jobs",
      job: (id: string) => `/api/admin/network/v1/jobs/${encodeURIComponent(id)}`,
      activity: "/api/admin/network/v1/activity",
      doctor: "/api/admin/network/v1/doctor",
      cancelJob: (id: string) =>
        `/api/admin/network/v1/jobs/${encodeURIComponent(id)}/cancel`,
      enrollments: "/api/admin/network/v1/enrollments",
      credentials: "/api/admin/network/v1/credentials",
      credential: (id: string) =>
        `/api/admin/network/v1/credentials/${encodeURIComponent(id)}`,
      disableNode: (id: string) =>
        `/api/admin/network/v1/nodes/${encodeURIComponent(id)}/disable`,
    },
  },
  workouts: {
    snapshot: "/api/workouts/snapshot",
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
