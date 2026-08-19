import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { WireGuardPeer, WireGuardRelay } from "./types";
import WireGuardPage from "./WireGuardPage";

const appStyles = readFileSync("src/index.css", "utf8");

const api = vi.hoisted(() => ({
  fetchRelays: vi.fn(),
  fetchPeers: vi.fn(),
  fetchMetrics: vi.fn(),
}));

vi.mock("./api", () => ({
  createWireGuardPeer: vi.fn(),
  createWireGuardRelay: vi.fn(),
  deleteWireGuardPeer: vi.fn(),
  deleteWireGuardRelay: vi.fn(),
  fetchWireGuardPeerCredentials: vi.fn(),
  fetchWireGuardPeerMetrics: api.fetchMetrics,
  fetchWireGuardPeers: api.fetchPeers,
  fetchWireGuardRelays: api.fetchRelays,
  rotateWireGuardAgentToken: vi.fn(),
  setWireGuardPeerEnabled: vi.fn(),
}));

const relay: WireGuardRelay = {
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
  lastSeenAt: new Date().toISOString(),
  routingMode: "RU_DIRECT_AWG_DEFAULT",
  ruPrefixCount: 8_642,
  routingUpdatedAt: "2026-08-19T18:00:00Z",
  createdAt: "2026-08-19T17:00:00Z",
  updatedAt: "2026-08-19T17:37:16Z",
};

const peer: WireGuardPeer = {
  id: "peer-1",
  name: "grophone",
  publicKey: "peer-public-key",
  assignedIp: "10.89.0.2",
  enabled: true,
  latestHandshakeAt: new Date().toISOString(),
  totalReceiveBytes: 122_000_000,
  totalTransmitBytes: 161_000_000,
  metricsUpdatedAt: new Date().toISOString(),
  createdAt: "2026-08-19T17:00:00Z",
  updatedAt: "2026-08-19T17:37:16Z",
};

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.resetAllMocks();
  api.fetchRelays.mockResolvedValue([relay]);
  api.fetchPeers.mockResolvedValue([peer]);
  api.fetchMetrics.mockResolvedValue({
    peerId: peer.id,
    range: "HOUR",
    from: "2026-08-19T17:00:00Z",
    to: "2026-08-19T18:00:00Z",
    points: [{ bucketStart: "2026-08-19T17:59:00Z", downloadBytes: 4096, uploadBytes: 2048 }],
  });
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
});

describe("WireGuardPage", () => {
  it("keeps the shared page inset when rendered directly inside the app content", async () => {
    render(<WireGuardPage />);

    await screen.findByRole("heading", { name: "VPN" });
    expect(appStyles).toMatch(/\.ant-layout-content > div:not\(\.app-page\)/);
    expect(appStyles).not.toMatch(/\.ant-layout-content > div\s*\{[^}]*padding:\s*0\s*!important/);
  });

  it("renders a flat operational surface with the route status and no nested cards or table", async () => {
    const { container } = render(<WireGuardPage />);

    expect(await screen.findByRole("heading", { name: "VPN" })).toBeInTheDocument();
    expect(screen.getByText("RU → напрямую")).toBeInTheDocument();
    expect(screen.getByText("Остальное → Veesp")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Добавить устройство" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Обновить данные" })).toBeInTheDocument();
    expect(screen.queryByText("Обновить")).not.toBeInTheDocument();
    expect(container.querySelector(".app-panel")).not.toBeInTheDocument();
    expect(container.querySelector(".ant-table")).not.toBeInTheDocument();
  });

  it("maps relay transmit to blue download and relay receive to green upload", async () => {
    render(<WireGuardPage />);

    const download = await screen.findByLabelText("Скачано 153.5 MiB");
    const upload = screen.getByLabelText("Отдано 116.3 MiB");
    expect(download).toHaveClass("wireguard-traffic--download");
    expect(download).toHaveTextContent("↓");
    expect(upload).toHaveClass("wireguard-traffic--upload");
    expect(upload).toHaveTextContent("↑");
  });

  it("refreshes relay and peer data every 15 seconds while the tab is visible", async () => {
    let poll: (() => void) | undefined;
    vi.spyOn(globalThis, "setInterval").mockImplementation(((handler: TimerHandler, timeout?: number) => {
      if (timeout === 15_000 && typeof handler === "function") poll = handler as () => void;
      return 1;
    }) as typeof setInterval);
    render(<WireGuardPage />);

    expect(await screen.findByLabelText("Скачано 153.5 MiB")).toBeInTheDocument();
    expect(poll).toBeTypeOf("function");
    api.fetchPeers.mockResolvedValue([{ ...peer, totalTransmitBytes: 200_000_000 }]);
    await act(async () => { poll?.(); });

    expect(await screen.findByLabelText("Скачано 190.7 MiB")).toBeInTheDocument();
    expect(api.fetchRelays.mock.calls.length).toBeGreaterThan(1);
  });

  it("opens a traffic drawer and loads all selectable time ranges", async () => {
    render(<WireGuardPage />);

    fireEvent.click(await screen.findByRole("button", { name: "График grophone" }));
    expect(await screen.findByRole("dialog", { name: "Трафик grophone" })).toBeInTheDocument();
    expect(api.fetchMetrics).toHaveBeenCalledWith(relay.id, peer.id, "HOUR");
    expect(screen.getByRole("radio", { name: "1ч" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "24ч" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "7д" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "30д" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "24ч" }));
    await waitFor(() => expect(api.fetchMetrics).toHaveBeenLastCalledWith(relay.id, peer.id, "DAY"));
  });

  it("keeps a fixed loading shell until the first response arrives", () => {
    api.fetchRelays.mockImplementation(() => new Promise(() => undefined));
    const { container } = render(<WireGuardPage />);

    expect(container.querySelector(".wireguard-loading-shell")).toBeInTheDocument();
    expect(container.querySelector(".wireguard-loading-shell")).toHaveAttribute("aria-busy", "true");
  });
});
