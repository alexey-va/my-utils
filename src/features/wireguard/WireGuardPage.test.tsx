import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
  vi.clearAllMocks();
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
});
