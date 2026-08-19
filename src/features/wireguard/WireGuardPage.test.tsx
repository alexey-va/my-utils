import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/errors";
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
  routeQuality: {
    measuredAt: "2026-08-19T18:00:00Z",
    direct: { target: "77.88.8.8", packetLossPercent: 0, averageRttMs: 2.7 },
    veesp: { target: "185.242.106.81", packetLossPercent: 0, averageRttMs: 26.6 },
  },
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
  metricsUpdatedAt: "2026-08-19T17:59:00Z",
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
    points: [{
      bucketStart: "2026-08-19T17:59:00Z",
      downloadBytes: 4096,
      uploadBytes: 2048,
      ruDownloadBytes: 1024,
      ruUploadBytes: 512,
      nonRuDownloadBytes: 3072,
      nonRuUploadBytes: 1536,
    }],
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
    expect(screen.getByText("VPN работает")).toBeInTheDocument();
    expect(screen.getByText("Маршрутизация работает")).toBeInTheDocument();
    expect(screen.queryByText("RU → напрямую")).not.toBeInTheDocument();
    expect(screen.queryByText("Остальное → Veesp")).not.toBeInTheDocument();
    expect(screen.getByLabelText("RU напрямую: потери 0%, задержка 2.7 мс")).toBeInTheDocument();
    expect(screen.getByLabelText("Veesp: потери 0%, задержка 26.6 мс")).toBeInTheDocument();
    const addDevice = screen.getByRole("button", { name: "Добавить устройство" });
    expect(addDevice.closest(".wireguard-peer-add")).toBeInTheDocument();
    expect(screen.queryByLabelText("Автообновление каждые 5 секунд")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Обновить данные" })).not.toBeInTheDocument();
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

  it("refreshes relay and peer data every 5 seconds while the tab is visible", async () => {
    let poll: (() => void) | undefined;
    vi.spyOn(globalThis, "setInterval").mockImplementation(((handler: TimerHandler, timeout?: number) => {
      if (timeout === 5_000 && typeof handler === "function") poll = handler as () => void;
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

  it("updates the relative heartbeat age every second without another API request", async () => {
    const lastSeenAt = "2026-08-19T18:00:00Z";
    const lastSeenMs = new Date(lastSeenAt).getTime();
    let clockTick: (() => void) | undefined;
    api.fetchRelays.mockResolvedValue([{ ...relay, lastSeenAt }]);
    vi.spyOn(Date, "now").mockReturnValue(lastSeenMs + 11_000);
    vi.spyOn(globalThis, "setInterval").mockImplementation(((handler: TimerHandler, timeout?: number) => {
      if (timeout === 1_000 && typeof handler === "function") clockTick = handler as () => void;
      return 1;
    }) as typeof setInterval);
    render(<WireGuardPage />);

    expect(await screen.findByText("Обновлено 11 сек. назад")).toBeInTheDocument();
    expect(clockTick).toBeTypeOf("function");
    const requestsBeforeTick = api.fetchRelays.mock.calls.length;
    vi.mocked(Date.now).mockReturnValue(lastSeenMs + 12_000);
    await act(async () => { clockTick?.(); });

    expect(screen.getByText("Обновлено 12 сек. назад")).toBeInTheDocument();
    expect(api.fetchRelays).toHaveBeenCalledTimes(requestsBeforeTick);
  });

  it("shows an inline traffic preview and rates from consecutive agent samples", async () => {
    let poll: (() => void) | undefined;
    vi.spyOn(globalThis, "setInterval").mockImplementation(((handler: TimerHandler, timeout?: number) => {
      if (timeout === 5_000 && typeof handler === "function") poll = handler as () => void;
      return 1;
    }) as typeof setInterval);
    render(<WireGuardPage />);

    expect(await screen.findByLabelText("Превью трафика grophone")).toBeInTheDocument();
    api.fetchPeers.mockResolvedValue([{
      ...peer,
      totalTransmitBytes: peer.totalTransmitBytes + 60 * 1024,
      totalReceiveBytes: peer.totalReceiveBytes + 30 * 1024,
      metricsUpdatedAt: "2026-08-19T18:00:00Z",
    }]);
    await act(async () => { poll?.(); });

    expect(await screen.findByLabelText("Текущая скорость скачивания 1.00 KiB/s")).toBeInTheDocument();
    expect(screen.getByLabelText("Текущая скорость отдачи 512 B/s")).toBeInTheDocument();
  });

  it("uses one preview scale for every peer so low traffic stays visually low", async () => {
    const slowPeer: WireGuardPeer = {
      ...peer,
      id: "peer-2",
      name: "slowphone",
      assignedIp: "10.89.0.3",
    };
    api.fetchPeers.mockResolvedValue([peer, slowPeer]);
    api.fetchMetrics.mockImplementation(async (_relayId: string, peerId: string) => ({
      peerId,
      range: "HOUR",
      from: "2026-08-19T17:00:00Z",
      to: "2026-08-19T18:00:00Z",
      points: [{
        bucketStart: "2026-08-19T17:59:00Z",
        downloadBytes: peerId === peer.id ? 60_000 : 60,
        uploadBytes: 0,
        ruDownloadBytes: 0,
        ruUploadBytes: 0,
        nonRuDownloadBytes: peerId === peer.id ? 60_000 : 60,
        nonRuUploadBytes: 0,
      }],
    }));

    render(<WireGuardPage />);

    const fastPreview = await screen.findByLabelText("Превью трафика grophone");
    const slowPreview = await screen.findByLabelText("Превью трафика slowphone");
    await waitFor(() => {
      const fastHeight = Number(fastPreview.querySelector(".wireguard-peer__preview-download")?.getAttribute("height"));
      const slowHeight = Number(slowPreview.querySelector(".wireguard-peer__preview-download")?.getAttribute("height"));
      expect(fastHeight).toBe(34);
      expect(slowHeight).toBeLessThan(1);
    });
  });

  it("opens a traffic drawer and loads all selectable time ranges", async () => {
    render(<WireGuardPage />);

    fireEvent.click(await screen.findByRole("button", { name: "График grophone" }));
    expect(await screen.findByRole("dialog", { name: "Трафик grophone" })).toBeInTheDocument();
    expect(screen.getByLabelText("Гистограмма трафика, общая шкала до 3.00 KiB")).toBeInTheDocument();
    expect(api.fetchMetrics).toHaveBeenCalledWith(relay.id, peer.id, "HOUR");
    expect(screen.getByRole("tab", { name: "RU" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Внешние" })).toBeInTheDocument();
    expect(screen.getByLabelText("RU скачано 1.00 KiB")).toBeInTheDocument();
    expect(screen.getByLabelText("RU отдано 512 B")).toBeInTheDocument();
    expect(screen.queryByLabelText("Разрез графика")).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "1ч" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "24ч" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "7д" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "30д" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "24ч" }));
    await waitFor(() => expect(api.fetchMetrics).toHaveBeenLastCalledWith(relay.id, peer.id, "DAY"));

    fireEvent.click(screen.getByRole("tab", { name: "Внешние" }));
    expect(screen.getByLabelText("Внешние скачано 3.00 KiB")).toBeInTheDocument();
    expect(screen.getByLabelText("Внешние отдано 1.50 KiB")).toBeInTheDocument();
    expect(screen.getByLabelText("Гистограмма трафика, общая шкала до 3.00 KiB")).toBeInTheDocument();
  });

  it("keeps a fixed loading shell until the first response arrives", () => {
    api.fetchRelays.mockImplementation(() => new Promise(() => undefined));
    const { container } = render(<WireGuardPage />);

    expect(container.querySelector(".wireguard-loading-shell")).toBeInTheDocument();
    expect(container.querySelector(".wireguard-loading-shell")).toHaveAttribute("aria-busy", "true");
  });

  it("does not present a failed relay request as an unconfigured VPN", async () => {
    api.fetchRelays.mockRejectedValue(new ApiError(502, "Bad Gateway"));

    render(<WireGuardPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("VPN API временно недоступен");
    expect(screen.getByRole("button", { name: "Повторить" })).toBeInTheDocument();
    expect(screen.queryByText("VPN ещё не настроен")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Настроить relay" })).not.toBeInTheDocument();
  });
});
