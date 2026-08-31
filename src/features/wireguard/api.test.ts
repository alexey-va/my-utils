import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createWireGuardPeer,
  createWireGuardPeerCategory,
  createWireGuardRelay,
  deleteWireGuardPeer,
  deleteWireGuardPeerCategory,
  deleteWireGuardRelay,
  fetchWireGuardPeerCredentials,
  fetchWireGuardPeerMetrics,
  fetchWireGuardPeers,
  fetchWireGuardRelays,
  fetchWireGuardSnapshot,
  reorderWireGuardPeerCategories,
  reorderWireGuardPeers,
  rotateWireGuardAgentToken,
  setWireGuardExitPreference,
  setWireGuardPeerEnabled,
  updateWireGuardPeer,
  updateWireGuardPeerCategory,
} from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("WireGuard API contract", () => {
  it("uses encoded admin routes, exact verbs, payloads, and uncached reads", async () => {
    const noContentCalls = new Set([2, 12, 15, 16, 17]);
    let callIndex = 0;
    const fetchMock = vi.fn().mockImplementation(() => {
      const response = noContentCalls.has(callIndex)
        ? new Response(null, { status: 204 })
        : jsonResponse(callIndex === 0 || callIndex === 6 ? [] : {});
      callIndex += 1;
      return Promise.resolve(response);
    });
    vi.stubGlobal("fetch", fetchMock);
    const relayId = "relay /?#";
    const peerId = "peer /?#";
    const categoryId = "category /?#";

    await fetchWireGuardRelays();
    await createWireGuardRelay({
      name: "Primary",
      publicEndpoint: "vpn.example.test:51820",
      clientCidr: "10.89.0.0/24",
      clientDns: "1.1.1.1",
    });
    await deleteWireGuardRelay(relayId);
    await rotateWireGuardAgentToken(relayId);
    await setWireGuardExitPreference(relayId, "SECONDARY");
    await fetchWireGuardSnapshot(relayId, "DAY");
    await fetchWireGuardPeers(relayId, "WEEK");
    await fetchWireGuardPeerMetrics(relayId, peerId, "MONTH");
    await createWireGuardPeer(relayId, { name: "Phone", category: "Личные" });
    await fetchWireGuardPeerCredentials(relayId, peerId);
    await updateWireGuardPeer(relayId, peerId, { name: "Main phone", category: "Личные" });
    await setWireGuardPeerEnabled(relayId, peerId, false);
    await reorderWireGuardPeers(relayId, [{ peerId, category: "Личные" }]);
    await createWireGuardPeerCategory(relayId, "Личные");
    await updateWireGuardPeerCategory(relayId, categoryId, "Дом");
    await reorderWireGuardPeerCategories(relayId, [{ categoryId }]);
    await deleteWireGuardPeerCategory(relayId, categoryId);
    await deleteWireGuardPeer(relayId, peerId);

    const encodedRelay = "relay%20%2F%3F%23";
    const encodedPeer = "peer%20%2F%3F%23";
    const encodedCategory = "category%20%2F%3F%23";
    expect(fetchMock.mock.calls.map(([url, init]) => [url, init.method])).toEqual([
      ["/api/admin/wireguard/relays", "GET"],
      ["/api/admin/wireguard/relays", "POST"],
      [`/api/admin/wireguard/relays/${encodedRelay}`, "DELETE"],
      [`/api/admin/wireguard/relays/${encodedRelay}/rotate-token`, "POST"],
      [`/api/admin/wireguard/relays/${encodedRelay}/exit-preference`, "PUT"],
      [`/api/admin/wireguard/relays/${encodedRelay}/snapshot?range=DAY`, "GET"],
      [`/api/admin/wireguard/relays/${encodedRelay}/peers?range=WEEK`, "GET"],
      [`/api/admin/wireguard/relays/${encodedRelay}/peers/${encodedPeer}/metrics?range=MONTH`, "GET"],
      [`/api/admin/wireguard/relays/${encodedRelay}/peers`, "POST"],
      [`/api/admin/wireguard/relays/${encodedRelay}/peers/${encodedPeer}/credentials`, "GET"],
      [`/api/admin/wireguard/relays/${encodedRelay}/peers/${encodedPeer}`, "PATCH"],
      [`/api/admin/wireguard/relays/${encodedRelay}/peers/${encodedPeer}`, "PATCH"],
      [`/api/admin/wireguard/relays/${encodedRelay}/peers/order`, "PUT"],
      [`/api/admin/wireguard/relays/${encodedRelay}/categories`, "POST"],
      [`/api/admin/wireguard/relays/${encodedRelay}/categories/${encodedCategory}`, "PATCH"],
      [`/api/admin/wireguard/relays/${encodedRelay}/categories/order`, "PUT"],
      [`/api/admin/wireguard/relays/${encodedRelay}/categories/${encodedCategory}`, "DELETE"],
      [`/api/admin/wireguard/relays/${encodedRelay}/peers/${encodedPeer}`, "DELETE"],
    ]);

    expect(fetchMock.mock.calls[1][1].body).toBe(JSON.stringify({
      name: "Primary",
      publicEndpoint: "vpn.example.test:51820",
      clientCidr: "10.89.0.0/24",
      clientDns: "1.1.1.1",
    }));
    expect(fetchMock.mock.calls[4][1].body).toBe(JSON.stringify({ preference: "SECONDARY" }));
    expect(fetchMock.mock.calls[8][1].body).toBe(JSON.stringify({ name: "Phone", category: "Личные" }));
    expect(fetchMock.mock.calls[10][1].body).toBe(JSON.stringify({ name: "Main phone", category: "Личные" }));
    expect(fetchMock.mock.calls[11][1].body).toBe(JSON.stringify({ enabled: false }));
    expect(fetchMock.mock.calls[12][1].body).toBe(JSON.stringify({ items: [{ peerId, category: "Личные" }] }));
    expect(fetchMock.mock.calls[13][1].body).toBe(JSON.stringify({ name: "Личные" }));
    expect(fetchMock.mock.calls[14][1].body).toBe(JSON.stringify({ name: "Дом" }));
    expect(fetchMock.mock.calls[15][1].body).toBe(JSON.stringify({ items: [{ categoryId }] }));
    for (const index of [0, 5, 6, 7, 9]) {
      expect(fetchMock.mock.calls[index][1].cache).toBe("no-store");
    }
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
