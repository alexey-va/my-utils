import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WireGuardPage from "./WireGuardPage";

const api = vi.hoisted(() => ({
  fetchRelays: vi.fn(),
  fetchPeers: vi.fn(),
}));

vi.mock("./api", () => ({
  createWireGuardPeer: vi.fn(),
  createWireGuardRelay: vi.fn(),
  deleteWireGuardPeer: vi.fn(),
  deleteWireGuardRelay: vi.fn(),
  fetchWireGuardPeerCredentials: vi.fn(),
  fetchWireGuardPeers: api.fetchPeers,
  fetchWireGuardRelays: api.fetchRelays,
  rotateWireGuardAgentToken: vi.fn(),
  setWireGuardPeerEnabled: vi.fn(),
}));

afterEach(cleanup);

beforeEach(() => {
  vi.resetAllMocks();
  api.fetchRelays.mockResolvedValue([]);
  api.fetchPeers.mockResolvedValue([]);
});

describe("WireGuardPage refresh", () => {
  it("uses an accessible icon-only refresh action", async () => {
    render(<WireGuardPage />);

    expect(await screen.findByRole("button", { name: "Обновить relays" })).toBeInTheDocument();
    expect(screen.queryByText("Обновить")).not.toBeInTheDocument();
  });

  it("keeps the empty relay panel stable during a background refresh", async () => {
    api.fetchRelays.mockResolvedValueOnce([]);
    render(<WireGuardPage />);

    expect(await screen.findByText("Relay ещё не создан")).toBeInTheDocument();
    api.fetchRelays.mockImplementationOnce(() => new Promise(() => undefined));
    fireEvent.click(screen.getByRole("button", { name: /Обновить/ }));

    expect(screen.getByText("Relay ещё не создан")).toBeInTheDocument();
  });

  it("refreshes peer metrics together with relay status", async () => {
    api.fetchRelays.mockResolvedValue([{
      id: "relay-1",
      name: "utils → veesp",
      publicEndpoint: "51.250.112.232:51820",
      clientCidr: "10.89.0.0/24",
      clientDns: "1.1.1.1",
      interfaceName: "wg-users",
      serverPublicKey: "server-public-key",
      desiredRevision: 1,
      appliedRevision: 1,
      status: "READY",
      lastSeenAt: "2026-08-19T17:37:16Z",
      createdAt: "2026-08-19T17:00:00Z",
      updatedAt: "2026-08-19T17:37:16Z",
    }]);
    api.fetchPeers
      .mockResolvedValueOnce([{
        id: "peer-1",
        name: "phone",
        publicKey: "peer-public-key",
        assignedIp: "10.89.0.2",
        enabled: true,
        latestHandshakeAt: null,
        totalReceiveBytes: 0,
        totalTransmitBytes: 0,
        metricsUpdatedAt: null,
        createdAt: "2026-08-19T17:00:00Z",
        updatedAt: "2026-08-19T17:00:00Z",
      }])
      .mockResolvedValueOnce([{
        id: "peer-1",
        name: "phone",
        publicKey: "peer-public-key",
        assignedIp: "10.89.0.2",
        enabled: true,
        latestHandshakeAt: "2026-08-19T17:36:13Z",
        totalReceiveBytes: 122_000_000,
        totalTransmitBytes: 161_000_000,
        metricsUpdatedAt: "2026-08-19T17:37:16Z",
        createdAt: "2026-08-19T17:00:00Z",
        updatedAt: "2026-08-19T17:37:16Z",
      }]);

    render(<WireGuardPage />);

    expect(await screen.findByText("0 B ↓ · 0 B ↑")).toBeInTheDocument();
    await waitFor(() => expect(api.fetchPeers).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: /Обновить/ }));

    expect(await screen.findByText("116.3 MiB ↓ · 153.5 MiB ↑")).toBeInTheDocument();
    expect(api.fetchPeers).toHaveBeenCalledTimes(2);
  });
});
