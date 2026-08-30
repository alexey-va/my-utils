import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/errors";
import type { WireGuardPeer, WireGuardPeerCategory, WireGuardPeerMetrics, WireGuardRelay } from "./types";
import WireGuardPage from "./WireGuardPage";

const appStyles = readFileSync("src/index.css", "utf8");

const api = vi.hoisted(() => ({
  deletePeer: vi.fn(),
  createCategory: vi.fn(),
  deleteCategory: vi.fn(),
  fetchRelays: vi.fn(),
  fetchPeers: vi.fn(),
  fetchMetrics: vi.fn(),
  fetchSnapshot: vi.fn(),
  reorderPeers: vi.fn(),
  reorderCategories: vi.fn(),
  setExitPreference: vi.fn(),
  updatePeer: vi.fn(),
  updateCategory: vi.fn(),
}));

vi.mock("./api", () => ({
  createWireGuardPeer: vi.fn(),
  createWireGuardPeerCategory: api.createCategory,
  createWireGuardRelay: vi.fn(),
  deleteWireGuardPeer: api.deletePeer,
  deleteWireGuardPeerCategory: api.deleteCategory,
  deleteWireGuardRelay: vi.fn(),
  fetchWireGuardPeerCredentials: vi.fn(),
  fetchWireGuardPeerMetrics: api.fetchMetrics,
  fetchWireGuardPeers: api.fetchPeers,
  fetchWireGuardRelays: api.fetchRelays,
  fetchWireGuardSnapshot: api.fetchSnapshot,
  reorderWireGuardPeers: api.reorderPeers,
  reorderWireGuardPeerCategories: api.reorderCategories,
  rotateWireGuardAgentToken: vi.fn(),
  setWireGuardExitPreference: api.setExitPreference,
  setWireGuardPeerEnabled: vi.fn(),
  updateWireGuardPeer: api.updatePeer,
  updateWireGuardPeerCategory: api.updateCategory,
}));

const userCategory: WireGuardPeerCategory = {
  id: "category-user",
  name: "Пользовательские",
  sortOrder: 0,
  createdAt: "2026-08-19T17:00:00Z",
  updatedAt: "2026-08-19T17:00:00Z",
};

const serviceCategory: WireGuardPeerCategory = {
  id: "category-service",
  name: "Служебные",
  sortOrder: 1,
  createdAt: "2026-08-19T17:00:00Z",
  updatedAt: "2026-08-19T17:00:00Z",
};

const relay: WireGuardRelay = {
  id: "relay-1",
  name: "utils → veesp",
  publicEndpoint: "utils.alexeyav.ru:51820",
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
  routingHealthy: true,
  routingCheckedAt: new Date().toISOString(),
  exitHealth: {
    schemaVersion: 1,
    checkedAt: new Date().toISOString(),
    overallStatus: "HEALTHY",
    activeExit: "primary",
    activeInterface: "awg-exit",
    changed: false,
    counters: {
      primary: { successes: 4, failures: 0 },
      secondary: { successes: 4, failures: 0 },
    },
    exits: {
      primary: { id: "primary", interface: "awg-exit", healthy: true, reason: null, expectedEgressIp: "91.197.0.191", observedEgressIp: "91.197.0.191", handshakeAtEpoch: 1_800_000_000, handshakeAgeSeconds: 5, latencyMs: 25 },
      secondary: { id: "secondary", interface: "awg-exit-b", healthy: true, reason: null, expectedEgressIp: "153.76.223.117", observedEgressIp: "153.76.223.117", handshakeAtEpoch: 1_800_000_000, handshakeAgeSeconds: 5, latencyMs: 35 },
    },
  },
  exitPreference: "AUTO",
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
  category: "Пользовательские",
  sortOrder: 0,
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

const peerMetrics = {
  peerId: peer.id,
  range: "HOUR" as const,
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
};

const exitHealthHistory = {
  range: "HOUR" as const,
  from: "2026-08-19T17:00:00Z",
  to: "2026-08-19T18:00:00Z",
  points: [
    {
      bucketStart: "2026-08-19T17:58:00Z",
      primaryAvailabilityPercent: 100,
      secondaryAvailabilityPercent: 100,
      primaryAverageLatencyMs: 25,
      secondaryAverageLatencyMs: 35,
      primaryFailureReason: null,
      secondaryFailureReason: null,
      activeExit: "primary" as const,
      overallStatus: "HEALTHY" as const,
      samples: 1,
    },
    {
      bucketStart: "2026-08-19T17:59:00Z",
      primaryAvailabilityPercent: 0,
      secondaryAvailabilityPercent: 100,
      primaryAverageLatencyMs: null,
      secondaryAverageLatencyMs: 36,
      primaryFailureReason: "egress_probe_failed",
      secondaryFailureReason: null,
      activeExit: "secondary" as const,
      overallStatus: "DEGRADED" as const,
      samples: 1,
    },
  ],
};

const snapshot = (
  nextRelay: WireGuardRelay = relay,
  nextPeers: WireGuardPeer[] = [peer],
  nextMetrics: Record<string, WireGuardPeerMetrics> = { [peer.id]: peerMetrics },
  nextCategories: WireGuardPeerCategory[] = [userCategory, serviceCategory],
) => ({
  relay: nextRelay,
  categories: nextCategories,
  peers: nextPeers,
  peerMetrics: nextMetrics,
  exitHealthHistory,
});

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
  api.fetchMetrics.mockResolvedValue(peerMetrics);
  api.fetchSnapshot.mockResolvedValue(snapshot());
  api.deletePeer.mockResolvedValue(undefined);
  api.createCategory.mockResolvedValue({ ...userCategory, id: "category-new", name: "Рабочие", sortOrder: 2 });
  api.deleteCategory.mockResolvedValue(undefined);
  api.reorderPeers.mockResolvedValue(undefined);
  api.reorderCategories.mockResolvedValue(undefined);
  api.setExitPreference.mockResolvedValue(relay);
  api.updatePeer.mockResolvedValue(peer);
  api.updateCategory.mockResolvedValue(userCategory);
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
    expect(await screen.findByText("VPN работает")).toBeInTheDocument();
    expect(screen.getByText("Маршрутизация работает")).toBeInTheDocument();
    expect(screen.queryByText("RU → напрямую")).not.toBeInTheDocument();
    expect(screen.queryByText("Остальное → Veesp")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Internal: потери 0%, задержка 2.7 мс")).toBeInTheDocument();
    expect(screen.getByLabelText("External: потери 0%, задержка 26.6 мс")).toBeInTheDocument();
    expect(screen.queryByText("External-трафик автоматически уходит через исправный exit")).not.toBeInTheDocument();
    expect(screen.queryByText("Фактический выход в интернет через каждый AWG-интерфейс")).not.toBeInTheDocument();
    const addDevice = screen.getByRole("button", { name: "Добавить устройство" });
    expect(addDevice.closest(".wireguard-peer-add")).toBeInTheDocument();
    fireEvent.click(addDevice);
    expect(await screen.findByPlaceholderText("Например, телефон")).toHaveAttribute("aria-label", "Название устройства");
    expect(screen.queryByLabelText("Автообновление каждые 5 секунд")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Обновить данные" })).not.toBeInTheDocument();
    expect(screen.queryByText("Обновить")).not.toBeInTheDocument();
    expect(container.querySelector(".app-panel")).not.toBeInTheDocument();
    expect(container.querySelector(".ant-table")).not.toBeInTheDocument();
  }, 15_000);

  it("shows reserve operation and broken routing instead of a false green status", async () => {
    const secondary = relay.exitHealth?.exits.secondary;
    const brokenRelay: WireGuardRelay = {
      ...relay,
      status: "DEGRADED",
      routingHealthy: false,
      exitHealth: {
        ...relay.exitHealth!,
        overallStatus: "DEGRADED",
        activeExit: "secondary",
        activeInterface: "awg-exit-b",
        exits: {
          ...relay.exitHealth!.exits,
          primary: { ...relay.exitHealth!.exits.primary, healthy: false, reason: "interface_missing", observedEgressIp: null, handshakeAtEpoch: 0, handshakeAgeSeconds: null, latencyMs: null },
          secondary: secondary!,
        },
      },
    };
    api.fetchRelays.mockResolvedValue([brokenRelay]);
    api.fetchSnapshot.mockResolvedValue(snapshot(brokenRelay));

    render(<WireGuardPage />);

    expect(await screen.findByText("VPN работает через резерв")).toBeInTheDocument();
    expect(screen.getByText("Маршрутизация не работает")).toBeInTheDocument();
    expect(screen.queryByText("VPN работает")).not.toBeInTheDocument();
  });

  it("lets an administrator choose the preferred exit server", async () => {
    const updatedRelay = { ...relay, exitPreference: "SECONDARY" as const, desiredRevision: 2 };
    api.setExitPreference.mockResolvedValue(updatedRelay);
    api.fetchSnapshot
      .mockResolvedValueOnce(snapshot())
      .mockResolvedValue(snapshot(updatedRelay));
    render(<WireGuardPage />);

    const selector = await screen.findByLabelText("Главный сервер");
    fireEvent.click(within(selector).getByRole("radio", { name: "Резерв" }));

    await waitFor(() => expect(api.setExitPreference).toHaveBeenCalledWith("relay-1", "SECONDARY"));
    expect(await within(selector).findByText("Резерв")).toBeInTheDocument();
  });

  it("shows backend rates beside arrows and period traffic underneath without a calculating state", async () => {
    render(<WireGuardPage />);

    const download = await screen.findByLabelText("Текущая скорость скачивания 1.00 KiB/s");
    const upload = screen.getByLabelText("Текущая скорость отдачи 512 B/s");
    expect(download).toHaveClass("wireguard-traffic--download");
    expect(download).toHaveTextContent("↓ 1.00 KiB/s");
    expect(upload).toHaveClass("wireguard-traffic--upload");
    expect(upload).toHaveTextContent("↑ 512 B/s");
    expect(screen.getByLabelText("Скачано за 24ч 4.00 KiB")).toBeInTheDocument();
    expect(screen.getByLabelText("Отдано за 24ч 2.00 KiB")).toBeInTheDocument();
    expect(screen.queryByText(/считается/i)).not.toBeInTheDocument();
  });

  it("refreshes relay and peer data every 3 seconds while the tab is visible", async () => {
    const polls: Array<() => void> = [];
    vi.spyOn(globalThis, "setInterval").mockImplementation(((handler: TimerHandler, timeout?: number) => {
      if (timeout === 3_000 && typeof handler === "function") polls.push(handler as () => void);
      return 1;
    }) as typeof setInterval);
    render(<WireGuardPage />);

    expect(await screen.findByLabelText("Скачано за 24ч 4.00 KiB")).toBeInTheDocument();
    expect(polls.length).toBeGreaterThan(0);
    const updatedPeer = { ...peer, traffic: { ...peer.traffic, downloadBytes: 8192 } };
    api.fetchSnapshot.mockResolvedValue(snapshot(relay, [updatedPeer], { [peer.id]: peerMetrics }));
    await act(async () => { polls.forEach((poll) => poll()); });

    expect(await screen.findByLabelText("Скачано за 24ч 8.00 KiB")).toBeInTheDocument();
    expect(api.fetchSnapshot.mock.calls.length).toBeGreaterThan(1);
    expect(api.fetchRelays).toHaveBeenCalledTimes(1);
  });

  it("polls one batched snapshot instead of fan-out requests for peers and previews", async () => {
    const polls: Array<() => void> = [];
    vi.spyOn(globalThis, "setInterval").mockImplementation(((handler: TimerHandler, timeout?: number) => {
      if (timeout === 3_000 && typeof handler === "function") polls.push(handler as () => void);
      return 1;
    }) as typeof setInterval);

    render(<WireGuardPage />);

    await screen.findByLabelText("Превью трафика grophone");
    expect(api.fetchSnapshot).toHaveBeenCalledWith(relay.id, "DAY");
    expect(polls).toHaveLength(1);
    const metricsCallsBeforePoll = api.fetchMetrics.mock.calls.length;
    await act(async () => { polls[0](); });
    await waitFor(() => expect(api.fetchSnapshot).toHaveBeenCalledTimes(2));
    expect(api.fetchMetrics).toHaveBeenCalledTimes(metricsCallsBeforePoll);
  });

  it("shows both exits and the active path without the redundant routing guide", async () => {
    render(<WireGuardPage />);

    expect(await screen.findByRole("region", { name: "Выходы в интернет" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Основной exit" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Резервный exit" })).toBeInTheDocument();
    expect(screen.getByText("Активен")).toBeInTheDocument();
    expect(screen.getByText("91.197.0.191")).toBeInTheDocument();
    expect(screen.getByText("153.76.223.117")).toBeInTheDocument();
    expect(screen.queryByText("Как устроен VPN и маршрутизация")).not.toBeInTheDocument();
  });

  it("renders the server key as plain copyable text instead of a boxed code field", async () => {
    render(<WireGuardPage />);

    const serverKey = await screen.findByText("server-public-key");
    expect(serverKey).toHaveClass("wireguard-server-key");
    expect(serverKey.querySelector("code")).toBeNull();
  });

  it("shows persisted real exit checks with outages and active-exit changes", async () => {
    render(<WireGuardPage />);

    const history = await screen.findByRole("region", { name: "История healthcheck туннелей" });
    expect(within(history).getByLabelText("Основной exit: доступность 50%")).toBeInTheDocument();
    expect(within(history).getByLabelText("Резервный exit: доступность 100%")).toBeInTheDocument();
    expect(within(history).getByLabelText("Сбой основного exit: egress_probe_failed")).toBeInTheDocument();
    expect(within(history).getByText("Переключение на резервный exit")).toBeInTheDocument();
  });

  it("updates the relative heartbeat age every second without another API request", async () => {
    const lastSeenAt = "2026-08-19T18:00:00Z";
    const lastSeenMs = new Date(lastSeenAt).getTime();
    let clockTick: (() => void) | undefined;
    api.fetchRelays.mockResolvedValue([{ ...relay, lastSeenAt }]);
    api.fetchSnapshot.mockResolvedValue(snapshot({ ...relay, lastSeenAt }));
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
    api.fetchSnapshot.mockResolvedValue(snapshot(relay, [peer, secondPeer], {
      [peer.id]: peerMetrics,
      [secondPeer.id]: { ...peerMetrics, peerId: secondPeer.id },
    }));
    render(<WireGuardPage />);

    expect(await screen.findByLabelText("Суммарная скорость скачивания 2.00 KiB/s")).toBeInTheDocument();
    expect(screen.getByLabelText("Суммарная скорость отдачи 1.00 KiB/s")).toBeInTheDocument();
    expect(screen.getByLabelText("Скачано всеми устройствами за 24ч 8.00 KiB")).toBeInTheDocument();
    expect(screen.getByLabelText("Отдано всеми устройствами за 24ч 4.00 KiB")).toBeInTheDocument();
    expect(api.fetchSnapshot).toHaveBeenCalledWith(relay.id, "DAY");

    fireEvent.click(screen.getByRole("radio", { name: "7д" }));
    await waitFor(() => expect(api.fetchSnapshot).toHaveBeenLastCalledWith(relay.id, "WEEK"));
  });

  it("uses only the compact relative last-seen text for an offline peer", async () => {
    const handshake = new Date("2026-08-19T18:00:00Z");
    vi.spyOn(Date, "now").mockReturnValue(handshake.getTime() + 30 * 60 * 60_000);
    const offlinePeer = { ...peer, latestHandshakeAt: handshake.toISOString() };
    api.fetchSnapshot.mockResolvedValue(snapshot(relay, [offlinePeer]));

    render(<WireGuardPage />);

    expect(await screen.findByText("1 дн. назад")).toBeInTheDocument();
    expect(screen.queryByText(/19\.08\.2026/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Был в сети/)).not.toBeInTheDocument();
  });

  it("keeps the actions menu aligned without the decorative key icon", async () => {
    render(<WireGuardPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Действия grophone" }));
    const menu = await screen.findByRole("menu");

    expect(within(menu).getByRole("menuitem", { name: "Показать конфиг" })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Изменить" })).toBeInTheDocument();
    expect(menu.querySelector(".anticon-key")).toBeNull();
  });

  it("creates and keeps an empty custom category as its own record", async () => {
    const workCategory = { ...userCategory, id: "category-work", name: "Рабочие", sortOrder: 2 };
    api.createCategory.mockResolvedValue(workCategory);
    api.fetchSnapshot
      .mockResolvedValueOnce(snapshot())
      .mockResolvedValue(snapshot(relay, [peer], { [peer.id]: peerMetrics }, [
        userCategory,
        serviceCategory,
        workCategory,
      ]));
    render(<WireGuardPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Категория" }));
    const dialog = await screen.findByRole("dialog", { name: "Новая категория" });
    fireEvent.change(within(dialog).getByLabelText("Название категории"), { target: { value: "Рабочие" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Создать" }));

    await waitFor(() => expect(api.createCategory).toHaveBeenCalledWith(relay.id, "Рабочие"));
    expect(await screen.findByRole("button", { name: "Действия категории Рабочие" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Рабочие" })).toHaveTextContent("Перетащи сюда нужные устройства");
  }, 15_000);

  it("renames a peer and moves it to another category", async () => {
    const updated = { ...peer, name: "Main phone", category: "Служебные" };
    api.updatePeer.mockResolvedValue(updated);
    api.fetchSnapshot
      .mockResolvedValueOnce(snapshot())
      .mockResolvedValue(snapshot(relay, [updated], { [updated.id]: peerMetrics }));
    render(<WireGuardPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Действия grophone" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Изменить" }));
    const dialog = await screen.findByRole("dialog", { name: "Изменить устройство" });
    const dialogQueries = within(dialog);
    fireEvent.change(dialogQueries.getByLabelText("Название"), { target: { value: "Main phone" } });
    fireEvent.mouseDown(dialogQueries.getByRole("combobox", { name: "Категория" }));
    const serviceOption = await waitFor(() => {
      const option = document.querySelector<HTMLElement>('.ant-select-item-option[title="Служебные"]');
      expect(option).not.toBeNull();
      return option!;
    });
    fireEvent.click(serviceOption);
    fireEvent.click(dialogQueries.getByRole("button", { name: "Сохранить" }));

    await waitFor(() => expect(api.updatePeer).toHaveBeenCalledWith(relay.id, peer.id, {
      name: "Main phone",
      category: "Служебные",
    }));
    expect(await screen.findByText("Main phone")).toBeInTheDocument();
  }, 15_000);

  it("exposes pointer and keyboard sortable handles for peers and categories", async () => {
    const tablet = { ...peer, id: "peer-2", name: "tablet", assignedIp: "10.89.0.3", sortOrder: 1 };
    api.fetchSnapshot.mockResolvedValue(snapshot(relay, [peer, tablet], {
      [peer.id]: peerMetrics,
      [tablet.id]: { ...peerMetrics, peerId: tablet.id },
    }));
    render(<WireGuardPage />);

    const tabletHandle = await screen.findByRole("button", { name: "Изменить порядок tablet" });
    expect(tabletHandle).toHaveAttribute("title", expect.stringContaining("пробел"));
    expect(tabletHandle).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("button", { name: "Изменить порядок категории Пользовательские" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Изменить порядок категории Служебные" })).toBeEnabled();
  }, 15_000);

  it("removes a deleted peer immediately without waiting for the snapshot read-back", async () => {
    render(<WireGuardPage />);
    await screen.findByRole("button", { name: "Действия grophone" });
    api.fetchSnapshot.mockImplementation(() => new Promise(() => undefined));

    fireEvent.click(screen.getByRole("button", { name: "Действия grophone" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Удалить" }));
    const confirm = await screen.findByRole("dialog", { name: "Удалить grophone?" });
    fireEvent.click(within(confirm).getByRole("button", { name: "Удалить" }));

    await waitFor(() => expect(api.deletePeer).toHaveBeenCalledWith(relay.id, peer.id));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Действия grophone" })).not.toBeInTheDocument());
  }, 15_000);

  it("uses one preview scale for every peer so low traffic stays visually low", async () => {
    const slowPeer: WireGuardPeer = {
      ...peer,
      id: "peer-2",
      name: "slowphone",
      assignedIp: "10.89.0.3",
    };
    const fastMetrics: WireGuardPeerMetrics = {
      ...peerMetrics,
      peerId: peer.id,
      range: "HOUR",
      from: "2026-08-19T17:00:00Z",
      to: "2026-08-19T18:00:00Z",
      points: [{
        bucketStart: "2026-08-19T17:59:00Z",
        downloadBytes: 60_000,
        uploadBytes: 0,
        ruDownloadBytes: 0,
        ruUploadBytes: 0,
        nonRuDownloadBytes: 60_000,
        nonRuUploadBytes: 0,
      }],
    };
    const slowMetrics = {
      ...fastMetrics,
      peerId: slowPeer.id,
      points: [{ ...fastMetrics.points[0], downloadBytes: 60, nonRuDownloadBytes: 60 }],
    };
    api.fetchSnapshot.mockResolvedValue(snapshot(relay, [peer, slowPeer], {
      [peer.id]: fastMetrics,
      [slowPeer.id]: slowMetrics,
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
    api.fetchSnapshot.mockImplementation(async (_relayId: string, range: string) => {
      const rangeMetrics = {
      peerId: peer.id,
      range: range as "HOUR" | "WEEK",
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
      };
      return snapshot(relay, [peer], { [peer.id]: rangeMetrics });
    });
    render(<WireGuardPage />);

    fireEvent.click(await screen.findByRole("radio", { name: "7д" }));
    const preview = await screen.findByLabelText("Превью трафика grophone");

    await waitFor(() => {
      expect(api.fetchSnapshot).toHaveBeenLastCalledWith(relay.id, "WEEK");
      expect(screen.getByText("7д назад")).toBeInTheDocument();
      expect(screen.getByText("сейчас")).toBeInTheDocument();
      const bar = preview.querySelector(".wireguard-peer__preview-download");
      expect(Number(bar?.getAttribute("x"))).toBeGreaterThan(120);
      expect(Number(bar?.getAttribute("width"))).toBeLessThan(4);
    });
  });

  it("refreshes compact traffic previews through the single snapshot timer", async () => {
    const threeSecondPolls: Array<() => void> = [];
    vi.spyOn(globalThis, "setInterval").mockImplementation(((handler: TimerHandler, timeout?: number) => {
      if (timeout === 3_000 && typeof handler === "function") {
        threeSecondPolls.push(handler as () => void);
      }
      return 1;
    }) as typeof setInterval);
    render(<WireGuardPage />);

    await screen.findByLabelText("Превью трафика grophone");
    await waitFor(() => expect(threeSecondPolls).toHaveLength(1));
    const callsBeforePoll = api.fetchSnapshot.mock.calls.length;
    await act(async () => {
      threeSecondPolls.forEach((poll) => poll());
    });

    await waitFor(() => expect(api.fetchSnapshot.mock.calls.length).toBeGreaterThan(callsBeforePoll));
  });

  it("opens a traffic drawer and loads all selectable time ranges", async () => {
    render(<WireGuardPage />);

    const graphTrigger = await screen.findByRole("button", { name: "Открыть график grophone" });
    expect(screen.queryByRole("button", { name: "График grophone" })).not.toBeInTheDocument();
    fireEvent.click(graphTrigger);
    const drawer = await screen.findByRole(
      "dialog",
      { name: "Трафик grophone" },
      { timeout: 15_000 },
    );
    const drawerQueries = within(drawer);
    expect(drawerQueries.getByLabelText("Гистограмма трафика, общая шкала до 4.00 KiB")).toBeInTheDocument();
    expect(drawerQueries.getByLabelText("Начало периода 2026-08-19T17:00:00Z")).toBeInTheDocument();
    expect(drawerQueries.getByLabelText("Конец периода 2026-08-19T18:00:00Z")).toBeInTheDocument();
    expect(api.fetchMetrics).toHaveBeenCalledWith(relay.id, peer.id, "DAY");
    expect(drawerQueries.getByRole("tab", { name: "Общий" })).toHaveAttribute("aria-selected", "true");
    expect(drawerQueries.getByRole("tab", { name: "RU" })).toBeInTheDocument();
    expect(drawerQueries.getByRole("tab", { name: "Внешние" })).toBeInTheDocument();
    expect(drawerQueries.getByLabelText("Общий трафик скачано 4.00 KiB")).toBeInTheDocument();
    expect(drawerQueries.getByLabelText("Общий трафик отдано 2.00 KiB")).toBeInTheDocument();
    expect(drawerQueries.queryByLabelText("Разрез графика")).not.toBeInTheDocument();
    expect(drawerQueries.getByRole("radio", { name: "1ч" })).toBeInTheDocument();
    expect(drawerQueries.getByRole("radio", { name: "24ч" })).toBeChecked();
    expect(drawerQueries.getByRole("radio", { name: "7д" })).toBeInTheDocument();
    expect(drawerQueries.getByRole("radio", { name: "30д" })).toBeInTheDocument();
    expect(drawerQueries.queryByText("Потяните рамку по графику, чтобы приблизить")).not.toBeInTheDocument();

    fireEvent.click(drawerQueries.getByRole("radio", { name: "1ч" }));
    await waitFor(() => expect(api.fetchMetrics).toHaveBeenLastCalledWith(relay.id, peer.id, "HOUR"));

    fireEvent.click(drawerQueries.getByRole("tab", { name: "Внешние" }));
    expect(drawerQueries.getByLabelText("Внешние скачано 3.00 KiB")).toBeInTheDocument();
    expect(drawerQueries.getByLabelText("Внешние отдано 1.50 KiB")).toBeInTheDocument();
    expect(drawerQueries.getByLabelText("Гистограмма трафика, общая шкала до 4.00 KiB")).toBeInTheDocument();
  }, 15_000);

  it("zooms the detailed chart on both axes by dragging and keeps the zoom between route tabs", async () => {
    render(<WireGuardPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Открыть график grophone" }));
    const drawer = await screen.findByRole("dialog", { name: "Трафик grophone" });
    const drawerQueries = within(drawer);
    const chart = await drawerQueries.findByLabelText("Интерактивный график Общий трафик");
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
  }, 10_000);

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
