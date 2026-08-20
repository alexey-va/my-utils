import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
  currentDownloadBytesPerSecond: 1024,
  currentUploadBytesPerSecond: 512,
  metricsUpdatedAt: "2026-08-19T17:59:00Z",
  traffic: {
    range: "HOUR",
    from: "2026-08-19T17:00:00Z",
    to: "2026-08-19T18:00:00Z",
    downloadBytes: 4096,
    uploadBytes: 2048,
    ruDownloadBytes: 1024,
    ruUploadBytes: 512,
    nonRuDownloadBytes: 3072,
    nonRuUploadBytes: 1536,
  },
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
    summary: {
      downloadBytes: 4096,
      uploadBytes: 2048,
      ruDownloadBytes: 1024,
      ruUploadBytes: 512,
      nonRuDownloadBytes: 3072,
      nonRuUploadBytes: 1536,
    },
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

  it("shows backend rates beside arrows and period traffic underneath without a calculating state", async () => {
    render(<WireGuardPage />);

    const download = await screen.findByLabelText("Текущая скорость скачивания 1.00 KiB/s");
    const upload = screen.getByLabelText("Текущая скорость отдачи 512 B/s");
    expect(download).toHaveClass("wireguard-traffic--download");
    expect(download).toHaveTextContent("↓ 1.00 KiB/s");
    expect(upload).toHaveClass("wireguard-traffic--upload");
    expect(upload).toHaveTextContent("↑ 512 B/s");
    expect(screen.getByLabelText("Скачано за 1ч 4.00 KiB")).toBeInTheDocument();
    expect(screen.getByLabelText("Отдано за 1ч 2.00 KiB")).toBeInTheDocument();
    expect(screen.queryByText(/считается/i)).not.toBeInTheDocument();
  });

  it("refreshes relay and peer data every 3 seconds while the tab is visible", async () => {
    const polls: Array<() => void> = [];
    vi.spyOn(globalThis, "setInterval").mockImplementation(((handler: TimerHandler, timeout?: number) => {
      if (timeout === 3_000 && typeof handler === "function") polls.push(handler as () => void);
      return 1;
    }) as typeof setInterval);
    render(<WireGuardPage />);

    expect(await screen.findByLabelText("Скачано за 1ч 4.00 KiB")).toBeInTheDocument();
    expect(polls.length).toBeGreaterThan(0);
    api.fetchPeers.mockResolvedValue([{ ...peer, traffic: { ...peer.traffic, downloadBytes: 8192 } }]);
    await act(async () => { polls.forEach((poll) => poll()); });

    expect(await screen.findByLabelText("Скачано за 1ч 8.00 KiB")).toBeInTheDocument();
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

  it("shows global speed and traffic sums and reloads every peer for the selected period", async () => {
    const secondPeer: WireGuardPeer = {
      ...peer,
      id: "peer-2",
      name: "tablet",
      assignedIp: "10.89.0.3",
    };
    api.fetchPeers.mockResolvedValue([peer, secondPeer]);
    render(<WireGuardPage />);

    expect(await screen.findByLabelText("Суммарная скорость скачивания 2.00 KiB/s")).toBeInTheDocument();
    expect(screen.getByLabelText("Суммарная скорость отдачи 1.00 KiB/s")).toBeInTheDocument();
    expect(screen.getByLabelText("Скачано всеми устройствами за 1ч 8.00 KiB")).toBeInTheDocument();
    expect(screen.getByLabelText("Отдано всеми устройствами за 1ч 4.00 KiB")).toBeInTheDocument();
    expect(api.fetchPeers).toHaveBeenCalledWith(relay.id, "HOUR");

    fireEvent.click(screen.getByRole("radio", { name: "24ч" }));
    await waitFor(() => expect(api.fetchPeers).toHaveBeenLastCalledWith(relay.id, "DAY"));
  });

  it("uses only the compact relative last-seen text for an offline peer", async () => {
    const handshake = new Date("2026-08-19T18:00:00Z");
    vi.spyOn(Date, "now").mockReturnValue(handshake.getTime() + 26 * 60_000);
    api.fetchPeers.mockResolvedValue([{ ...peer, latestHandshakeAt: handshake.toISOString() }]);

    render(<WireGuardPage />);

    expect(await screen.findByText("26 мин. назад")).toBeInTheDocument();
    expect(screen.queryByText(/Был в сети/)).not.toBeInTheDocument();
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

  it("places a fresh sparse bucket near the end of the selected preview timeline", async () => {
    api.fetchMetrics.mockImplementation(async (_relayId: string, peerId: string, range: string) => ({
      peerId,
      range,
      from: range === "WEEK" ? "2026-08-13T12:00:00Z" : "2026-08-20T11:00:00Z",
      to: "2026-08-20T12:00:00Z",
      summary: {
        downloadBytes: 4096,
        uploadBytes: 0,
        ruDownloadBytes: 4096,
        ruUploadBytes: 0,
        nonRuDownloadBytes: 0,
        nonRuUploadBytes: 0,
      },
      points: [{
        bucketStart: "2026-08-20T11:30:00Z",
        downloadBytes: 4096,
        uploadBytes: 0,
        ruDownloadBytes: 4096,
        ruUploadBytes: 0,
        nonRuDownloadBytes: 0,
        nonRuUploadBytes: 0,
      }],
    }));
    render(<WireGuardPage />);

    fireEvent.click(await screen.findByRole("radio", { name: "7д" }));
    const preview = await screen.findByLabelText("Превью трафика grophone");

    await waitFor(() => {
      expect(api.fetchMetrics).toHaveBeenLastCalledWith(relay.id, peer.id, "WEEK");
      expect(screen.getByText("7д назад")).toBeInTheDocument();
      expect(screen.getByText("сейчас")).toBeInTheDocument();
      const bar = preview.querySelector(".wireguard-peer__preview-download");
      expect(Number(bar?.getAttribute("x"))).toBeGreaterThan(120);
      expect(Number(bar?.getAttribute("width"))).toBeLessThan(4);
    });
  });

  it("refreshes compact traffic previews every 3 seconds", async () => {
    const threeSecondPolls: Array<() => void> = [];
    vi.spyOn(globalThis, "setInterval").mockImplementation(((handler: TimerHandler, timeout?: number) => {
      if (timeout === 3_000 && typeof handler === "function") {
        threeSecondPolls.push(handler as () => void);
      }
      return 1;
    }) as typeof setInterval);
    render(<WireGuardPage />);

    await screen.findByLabelText("Превью трафика grophone");
    await waitFor(() => expect(threeSecondPolls).toHaveLength(2));
    const callsBeforePoll = api.fetchMetrics.mock.calls.length;
    await act(async () => {
      threeSecondPolls.forEach((poll) => poll());
    });

    await waitFor(() => expect(api.fetchMetrics.mock.calls.length).toBeGreaterThan(callsBeforePoll));
  });

  it("opens a traffic drawer and loads all selectable time ranges", async () => {
    render(<WireGuardPage />);

    const graphTrigger = await screen.findByRole("button", { name: "Открыть график grophone" });
    expect(screen.queryByRole("button", { name: "График grophone" })).not.toBeInTheDocument();
    fireEvent.click(graphTrigger);
    const drawer = await screen.findByRole("dialog", { name: "Трафик grophone" });
    const drawerQueries = within(drawer);
    expect(drawerQueries.getByLabelText("Гистограмма трафика, общая шкала до 3.00 KiB")).toBeInTheDocument();
    expect(drawerQueries.getByLabelText("Начало периода 2026-08-19T17:00:00Z")).toBeInTheDocument();
    expect(drawerQueries.getByLabelText("Конец периода 2026-08-19T18:00:00Z")).toBeInTheDocument();
    expect(api.fetchMetrics).toHaveBeenCalledWith(relay.id, peer.id, "HOUR");
    expect(drawerQueries.getByRole("tab", { name: "RU" })).toHaveAttribute("aria-selected", "true");
    expect(drawerQueries.getByRole("tab", { name: "Внешние" })).toBeInTheDocument();
    expect(drawerQueries.getByLabelText("RU скачано 1.00 KiB")).toBeInTheDocument();
    expect(drawerQueries.getByLabelText("RU отдано 512 B")).toBeInTheDocument();
    expect(drawerQueries.queryByLabelText("Разрез графика")).not.toBeInTheDocument();
    expect(drawerQueries.getByRole("radio", { name: "1ч" })).toBeChecked();
    expect(drawerQueries.getByRole("radio", { name: "24ч" })).toBeInTheDocument();
    expect(drawerQueries.getByRole("radio", { name: "7д" })).toBeInTheDocument();
    expect(drawerQueries.getByRole("radio", { name: "30д" })).toBeInTheDocument();

    fireEvent.click(drawerQueries.getByRole("radio", { name: "24ч" }));
    await waitFor(() => expect(api.fetchMetrics).toHaveBeenLastCalledWith(relay.id, peer.id, "DAY"));

    fireEvent.click(drawerQueries.getByRole("tab", { name: "Внешние" }));
    expect(drawerQueries.getByLabelText("Внешние скачано 3.00 KiB")).toBeInTheDocument();
    expect(drawerQueries.getByLabelText("Внешние отдано 1.50 KiB")).toBeInTheDocument();
    expect(drawerQueries.getByLabelText("Гистограмма трафика, общая шкала до 3.00 KiB")).toBeInTheDocument();
  });

  it("zooms the detailed chart on both axes by dragging and keeps the zoom between route tabs", async () => {
    render(<WireGuardPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Открыть график grophone" }));
    const drawer = await screen.findByRole("dialog", { name: "Трафик grophone" });
    const drawerQueries = within(drawer);
    const chart = await drawerQueries.findByLabelText("Интерактивный график RU");
    vi.spyOn(chart, "getBoundingClientRect").mockReturnValue({
      x: 100,
      y: 50,
      left: 100,
      top: 50,
      right: 600,
      bottom: 350,
      width: 500,
      height: 300,
      toJSON: () => undefined,
    });

    fireEvent.pointerDown(chart, { button: 0, pointerId: 1, clientX: 274, clientY: 112 });
    fireEvent.pointerMove(chart, { pointerId: 1, clientX: 486, clientY: 262 });
    expect(drawerQueries.getByLabelText("Выбранная область масштаба")).toBeInTheDocument();
    expect(drawerQueries.getByText(/Выбрано:/)).toBeInTheDocument();
    fireEvent.pointerUp(chart, { pointerId: 1, clientX: 486, clientY: 262 });

    expect(drawerQueries.getByText(/Приближение ×/)).toBeInTheDocument();
    expect(drawerQueries.getByRole("button", { name: "Назад по масштабу" })).toBeInTheDocument();
    expect(drawerQueries.getByRole("button", { name: "Показать весь период" })).toBeInTheDocument();
    fireEvent.click(drawerQueries.getByRole("tab", { name: "Внешние" }));
    expect(drawerQueries.getByRole("button", { name: "Показать весь период" })).toBeInTheDocument();

    const firstZoomStart = drawerQueries.getByText("Начало").parentElement?.getAttribute("aria-label");
    fireEvent.pointerDown(chart, { button: 0, pointerId: 2, clientX: 274, clientY: 112 });
    fireEvent.pointerMove(chart, { pointerId: 2, clientX: 486, clientY: 262 });
    fireEvent.pointerUp(chart, { pointerId: 2, clientX: 486, clientY: 262 });
    expect(drawerQueries.getByText("Начало").parentElement?.getAttribute("aria-label")).not.toBe(firstZoomStart);
    fireEvent.click(drawerQueries.getByRole("button", { name: "Назад по масштабу" }));
    expect(drawerQueries.getByText("Начало").parentElement?.getAttribute("aria-label")).toBe(firstZoomStart);

    fireEvent.doubleClick(chart);
    expect(drawerQueries.queryByRole("button", { name: "Показать весь период" })).not.toBeInTheDocument();
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
