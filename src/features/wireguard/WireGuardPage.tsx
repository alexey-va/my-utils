import {
  DeleteOutlined,
  EllipsisOutlined,
  ExpandAltOutlined,
  KeyOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { Button, Dropdown, Empty, Form, Input, Modal, Segmented, Typography, message } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "../../api/errors";
import PageLayout from "../../shared/components/PageLayout";
import {
  createWireGuardPeer,
  createWireGuardRelay,
  deleteWireGuardPeer,
  deleteWireGuardRelay,
  fetchWireGuardPeerCredentials,
  fetchWireGuardRelays,
  fetchWireGuardSnapshot,
  rotateWireGuardAgentToken,
  setWireGuardExitPreference,
  setWireGuardPeerEnabled,
} from "./api";
import type {
  CreateWireGuardRelay,
  WireGuardPeer,
  WireGuardPeerCredentials,
  WireGuardExitHealthHistory,
  WireGuardExitPreference,
  WireGuardPeerMetrics,
  WireGuardPeerMetricsRange,
  WireGuardRelay,
} from "./types";
import WireGuardCredentialsModal from "./WireGuardCredentialsModal";
import WireGuardExitHealthChart from "./WireGuardExitHealthChart";
import WireGuardPeerMetricsDrawer from "./WireGuardPeerMetricsDrawer";
import WireGuardRoutingOverview from "./WireGuardRoutingOverview";
import "./wireguard.css";

const POLL_INTERVAL_MS = 3_000;
const ONLINE_WINDOW_MS = 3 * 60_000;
const PREVIEW_WIDTH = 180;
const PREVIEW_HEIGHT = 34;

const previewBucketCounts: Record<WireGuardPeerMetricsRange, number> = {
  HOUR: 60,
  DAY: 96,
  WEEK: 168,
  MONTH: 120,
};

const trafficRangeOptions: Array<{ label: string; value: WireGuardPeerMetricsRange }> = [
  { label: "1ч", value: "HOUR" },
  { label: "24ч", value: "DAY" },
  { label: "7д", value: "WEEK" },
  { label: "30д", value: "MONTH" },
];

function trafficRangeLabel(range: WireGuardPeerMetricsRange): string {
  return trafficRangeOptions.find((option) => option.value === range)?.label ?? range;
}

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error.message : fallback;

function bytes(value: number): string {
  if (value < 1024) return `${Math.round(value)} B`;
  const units = ["KiB", "MiB", "GiB", "TiB"];
  let amount = value / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && amount >= 1024; index += 1) {
    amount /= 1024;
    unit = units[index];
  }
  return `${amount.toFixed(amount >= 10 ? 1 : 2)} ${unit}`;
}

function speed(value: number): string {
  return `${bytes(value)}/s`;
}

function PeerTrafficPreview({
  peerName,
  metrics,
  range,
  maximum,
  onOpen,
}: {
  peerName: string;
  metrics?: WireGuardPeerMetrics;
  range: WireGuardPeerMetricsRange;
  maximum: number;
  onOpen: () => void;
}) {
  const from = metrics ? new Date(metrics.from).getTime() : Number.NaN;
  const to = metrics ? new Date(metrics.to).getTime() : Number.NaN;
  const duration = to - from;
  const barWidth = Math.max(1, Math.min(4, (PREVIEW_WIDTH / previewBucketCounts[range]) * 0.8));
  const buckets = duration > 0 ? metrics?.points ?? [] : [];
  return (
    <button
      type="button"
      className="wireguard-peer__preview-wrap"
      onClick={onOpen}
      aria-label={`Открыть график ${peerName}`}
      title="Открыть подробный график"
    >
      <ExpandAltOutlined className="wireguard-peer__preview-expand" aria-hidden="true" />
      <svg
        className="wireguard-peer__preview"
        viewBox={`0 0 ${PREVIEW_WIDTH} ${PREVIEW_HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Превью трафика ${peerName}`}
      >
        <line className="wireguard-peer__preview-baseline" x1="0" y1={PREVIEW_HEIGHT - 1} x2={PREVIEW_WIDTH} y2={PREVIEW_HEIGHT - 1} />
        <line className="wireguard-peer__preview-edge" x1="0" y1={PREVIEW_HEIGHT - 5} x2="0" y2={PREVIEW_HEIGHT} />
        <line className="wireguard-peer__preview-edge" x1={PREVIEW_WIDTH} y1={PREVIEW_HEIGHT - 5} x2={PREVIEW_WIDTH} y2={PREVIEW_HEIGHT} />
        {buckets.map((point) => {
          const downloadHeight = (point.downloadBytes / maximum) * PREVIEW_HEIGHT;
          const uploadHeight = (point.uploadBytes / maximum) * PREVIEW_HEIGHT;
          const position = (new Date(point.bucketStart).getTime() - from) / duration;
          const x = Math.max(0, Math.min(PREVIEW_WIDTH - barWidth, position * PREVIEW_WIDTH));
          return (
            <g key={point.bucketStart}>
              <rect
                className="wireguard-peer__preview-download"
                x={x}
                y={PREVIEW_HEIGHT - downloadHeight}
                width={barWidth}
                height={downloadHeight}
                rx="1"
              />
              <rect
                className="wireguard-peer__preview-upload"
                x={x}
                y={Math.max(0, PREVIEW_HEIGHT - downloadHeight - uploadHeight)}
                width={barWidth}
                height={uploadHeight}
                rx="1"
              />
            </g>
          );
        })}
      </svg>
      <div className="wireguard-peer__preview-axis" aria-label={`Период превью: ${trafficRangeLabel(range)} назад — сейчас`}>
        <span>{trafficRangeLabel(range)} назад</span>
        <span>сейчас</span>
      </div>
    </button>
  );
}

function date(value: string | null): string {
  return value ? new Date(value).toLocaleString("ru-RU") : "—";
}

function relativeTime(value: string | null, now = Date.now()): string {
  if (!value) return "данных ещё нет";
  const seconds = Math.max(0, Math.round((now - new Date(value).getTime()) / 1000));
  if (seconds < 10) return "только что";
  if (seconds < 60) return `${seconds} сек. назад`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} мин. назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч. назад`;
  return date(value);
}

function peerPresence(peer: WireGuardPeer, now: number): { label: string; tone: string } {
  if (!peer.enabled) return { label: "Отключён", tone: "disabled" };
  if (!peer.latestHandshakeAt) return { label: "Не подключался", tone: "idle" };
  if (now - new Date(peer.latestHandshakeAt).getTime() <= ONLINE_WINDOW_MS) {
    return { label: "Онлайн", tone: "online" };
  }
  return { label: relativeTime(peer.latestHandshakeAt, now), tone: "idle" };
}

function relayHealth(relay: WireGuardRelay): { label: string; tone: string } {
  switch (relay.status) {
    case "READY": return { label: "VPN работает", tone: "online" };
    case "DEGRADED":
      return relay.exitHealth?.activeExit === "secondary"
        ? { label: "VPN работает через резерв", tone: "warning" }
        : { label: "VPN работает с ограничениями", tone: "warning" };
    case "DOWN": return { label: "VPN не работает", tone: "error" };
    case "SYNCING": return { label: "VPN синхронизируется", tone: "syncing" };
    case "STALE": return { label: "VPN: агент не отвечает", tone: "error" };
    default: return { label: "VPN ждёт агента", tone: "idle" };
  }
}

function routingHealth(relay: WireGuardRelay, now = Date.now()): { label: string; tone: string } {
  if (relay.status === "STALE") return { label: "Маршрутизация недоступна", tone: "error" };
  if (relay.routingHealthy === false) return { label: "Маршрутизация не работает", tone: "error" };
  if (!relay.routingCheckedAt || now - new Date(relay.routingCheckedAt).getTime() > 45_000) {
    return { label: "Маршрутизация недоступна", tone: "error" };
  }
  if (relay.routingHealthy !== true) return { label: "Маршрутизация настраивается", tone: "syncing" };
  if (relay.routingMode === "RU_DIRECT_AWG_DEFAULT") {
    return { label: "Маршрутизация работает", tone: "online" };
  }
  return { label: "Маршрутизация по странам выключена", tone: "idle" };
}

function compactNumber(value: number): string {
  return Number(value.toFixed(1)).toString();
}

function routeQualityLabel(name: string, loss: number, rtt: number | null): string {
  const lossLabel = compactNumber(loss);
  const rttLabel = rtt === null ? "задержка недоступна" : `задержка ${compactNumber(rtt)} мс`;
  return `${name}: потери ${lossLabel}%, ${rttLabel}`;
}

function routeQualityTone(loss: number): string {
  if (loss >= 10) return "error";
  if (loss > 0) return "warning";
  return "healthy";
}

function snapshotErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return "Сессия администратора истекла. Войдите заново.";
    }
    if (error.status >= 500) {
      return `VPN API временно недоступен (код ${error.status}).`;
    }
    return error.displayMessage();
  }
  return "Не удалось получить состояние VPN.";
}

export default function WireGuardPage() {
  const [relays, setRelays] = useState<WireGuardRelay[]>([]);
  const [peers, setPeers] = useState<WireGuardPeer[]>([]);
  const [trafficRange, setTrafficRange] = useState<WireGuardPeerMetricsRange>("HOUR");
  const [metricPreviews, setMetricPreviews] = useState<Record<string, WireGuardPeerMetrics>>({});
  const [exitHealthHistory, setExitHealthHistory] = useState<WireGuardExitHealthHistory | null>(null);
  const [exitPreferencePending, setExitPreferencePending] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadFailure, setLoadFailure] = useState<string | null>(null);
  const [createRelayOpen, setCreateRelayOpen] = useState(false);
  const [createPeerOpen, setCreatePeerOpen] = useState(false);
  const [peerName, setPeerName] = useState("");
  const [credentials, setCredentials] = useState<WireGuardPeerCredentials | null>(null);
  const [metricsPeer, setMetricsPeer] = useState<WireGuardPeer | null>(null);
  const [agentToken, setAgentToken] = useState<string | null>(null);
  const [relayForm] = Form.useForm<CreateWireGuardRelay>();
  const [modal, modalContext] = Modal.useModal();
  const snapshotInFlight = useRef<string | null>(null);
  const snapshotGeneration = useRef(0);
  const selected = relays[0] ?? null;
  const selectedRelayId = selected?.id ?? null;
  const previewMaximum = useMemo(
    () => Math.max(1, ...Object.values(metricPreviews).flatMap((metrics) => (
      metrics.points.map((point) => point.downloadBytes + point.uploadBytes)
    ))),
    [metricPreviews],
  );
  const totals = useMemo(
    () => peers.reduce(
      (sum, peer) => ({
        downloadSpeed: sum.downloadSpeed + peer.currentDownloadBytesPerSecond,
        uploadSpeed: sum.uploadSpeed + peer.currentUploadBytesPerSecond,
        downloadBytes: sum.downloadBytes + peer.traffic.downloadBytes,
        uploadBytes: sum.uploadBytes + peer.traffic.uploadBytes,
      }),
      { downloadSpeed: 0, uploadSpeed: 0, downloadBytes: 0, uploadBytes: 0 },
    ),
    [peers],
  );

  const loadSnapshot = useCallback(async (
    relayId = selectedRelayId,
    range = trafficRange,
  ) => {
    if (!relayId) return;
    const requestKey = `${relayId}:${range}`;
    if (snapshotInFlight.current === requestKey) return;
    snapshotInFlight.current = requestKey;
    const generation = ++snapshotGeneration.current;
    try {
      const snapshot = await fetchWireGuardSnapshot(relayId, range);
      if (generation !== snapshotGeneration.current) return;
      setRelays((current) => current.map((relay) => relay.id === snapshot.relay.id ? snapshot.relay : relay));
      setPeers(snapshot.peers);
      setMetricPreviews(snapshot.peerMetrics);
      setExitHealthHistory(snapshot.exitHealthHistory);
      setLoadFailure(null);
    } catch (error) {
      const failure = snapshotErrorMessage(error);
      setLoadFailure(failure);
      message.error(failure);
    } finally {
      if (generation === snapshotGeneration.current) setInitialLoading(false);
      if (snapshotInFlight.current === requestKey) snapshotInFlight.current = null;
    }
  }, [selectedRelayId, trafficRange]);

  const loadRelays = useCallback(async () => {
    try {
      const nextRelays = await fetchWireGuardRelays();
      setRelays(nextRelays);
      if (nextRelays.length === 0) setInitialLoading(false);
      setLoadFailure(null);
    } catch (error) {
      const failure = snapshotErrorMessage(error);
      setLoadFailure(failure);
      setInitialLoading(false);
      message.error(failure);
    }
  }, []);

  useEffect(() => {
    void loadRelays();
  }, [loadRelays]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedRelayId) return;
    const poll = () => {
      if (document.visibilityState === "visible") void loadSnapshot(selectedRelayId, trafficRange);
    };
    poll();
    const interval = window.setInterval(poll, POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", poll);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [loadSnapshot, selectedRelayId, trafficRange]);

  const createRelay = async (values: CreateWireGuardRelay) => {
    try {
      const created = await createWireGuardRelay(values);
      setCreateRelayOpen(false);
      setAgentToken(created.agentToken);
      relayForm.resetFields();
      setRelays([created]);
      await loadSnapshot(created.id, trafficRange);
    } catch (error) {
      message.error(errorMessage(error, "Не удалось создать relay"));
    }
  };

  const createPeer = async () => {
    if (!selected || !peerName.trim()) return;
    try {
      const created = await createWireGuardPeer(selected.id, peerName.trim());
      setPeerName("");
      setCreatePeerOpen(false);
      setCredentials(created);
      await loadSnapshot(selected.id, trafficRange);
    } catch (error) {
      message.error(errorMessage(error, "Не удалось добавить устройство"));
    }
  };

  const showCredentials = async (peer: WireGuardPeer) => {
    if (!selected) return;
    try {
      setCredentials(await fetchWireGuardPeerCredentials(selected.id, peer.id));
    } catch (error) {
      message.error(errorMessage(error, "Не удалось получить конфиг"));
    }
  };

  const setPeerEnabled = async (peer: WireGuardPeer, enabled: boolean) => {
    if (!selected) return;
    try {
      const updated = await setWireGuardPeerEnabled(selected.id, peer.id, enabled);
      setPeers((items) => items.map((item) => item.id === updated.id ? updated : item));
      void loadSnapshot(selected.id, trafficRange);
    } catch (error) {
      message.error(errorMessage(error, "Не удалось изменить устройство"));
    }
  };

  const changeExitPreference = async (preference: WireGuardExitPreference) => {
    if (!selected || selected.exitPreference === preference) return;
    setExitPreferencePending(true);
    try {
      const updated = await setWireGuardExitPreference(selected.id, preference);
      setRelays((items) => items.map((item) => item.id === updated.id ? updated : item));
      void loadSnapshot(selected.id, trafficRange);
    } catch (error) {
      message.error(errorMessage(error, "Не удалось переключить главный сервер"));
    } finally {
      setExitPreferencePending(false);
    }
  };

  const confirmDeletePeer = (peer: WireGuardPeer) => {
    if (!selected) return;
    modal.confirm({
      title: `Удалить ${peer.name}?`,
      content: "Устройство потеряет доступ, а его адрес освободится.",
      okText: "Удалить",
      okButtonProps: { danger: true },
      cancelText: "Отмена",
      onOk: async () => {
        try {
          await deleteWireGuardPeer(selected.id, peer.id);
          await loadSnapshot(selected.id, trafficRange);
        } catch (error) {
          message.error(errorMessage(error, "Не удалось удалить устройство"));
          throw error;
        }
      },
    });
  };

  return (
    <PageLayout title="VPN">
      {modalContext}
      <section className="wireguard-page" aria-label="Состояние VPN">
        {initialLoading ? (
          <div className="wireguard-loading-shell" aria-busy="true" aria-label="Загрузка VPN">
            <span className="wireguard-loading-line wireguard-loading-line--status" />
            <span className="wireguard-loading-line wireguard-loading-line--peer" />
          </div>
        ) : selected ? (
          <>
            <header className="wireguard-status-strip">
              {(() => {
                const health = relayHealth(selected);
                return (
                  <span className={`wireguard-status wireguard-status--${health.tone}`}>
                    <i aria-hidden="true" /> {health.label}
                  </span>
                );
              })()}
              {(() => {
                const health = routingHealth(selected, now);
                return (
                  <span className={`wireguard-status wireguard-status--${health.tone}`}>
                    <i aria-hidden="true" /> {health.label}
                  </span>
                );
              })()}
              <span className="wireguard-updated">Обновлено {relativeTime(selected.lastSeenAt, now)}</span>
            </header>

            {selected.routeQuality ? (
              <div className="wireguard-quality-strip" aria-label="Качество маршрутов">
                {([
                  ["Internal", selected.routeQuality.direct],
                  ["External", selected.routeQuality.veesp],
                ] as const).map(([name, probe]) => {
                  const label = routeQualityLabel(name, probe.packetLossPercent, probe.averageRttMs);
                  return (
                    <span
                      key={name}
                      className={`wireguard-quality wireguard-quality--${routeQualityTone(probe.packetLossPercent)}`}
                      aria-label={label}
                      title={`Проверка ${probe.target} · ${relativeTime(selected.routeQuality?.measuredAt ?? null, now)}`}
                    >
                      <i aria-hidden="true" />
                      <b>{name}</b>
                      <span>{compactNumber(probe.packetLossPercent)}% потерь</span>
                      <span>{probe.averageRttMs === null ? "RTT —" : `${compactNumber(probe.averageRttMs)} мс`}</span>
                    </span>
                  );
                })}
              </div>
            ) : (
              <div className="wireguard-quality-pending">Проверка качества маршрутов накапливается</div>
            )}

            <WireGuardRoutingOverview
              health={selected.exitHealth}
              now={now}
              preference={selected.exitPreference}
              pending={exitPreferencePending}
              applying={selected.appliedRevision !== selected.desiredRevision}
              onPreferenceChange={(preference) => void changeExitPreference(preference)}
            />
            <WireGuardExitHealthChart history={exitHealthHistory} />

            <section className="wireguard-traffic-overview" aria-label="Суммарный трафик VPN">
              <div className="wireguard-traffic-overview__values">
                <span className="wireguard-peer__traffic-value">
                  <span
                    className="wireguard-traffic wireguard-traffic--download"
                    aria-label={`Суммарная скорость скачивания ${speed(totals.downloadSpeed)}`}
                  >
                    <b aria-hidden="true">↓</b> {speed(totals.downloadSpeed)}
                  </span>
                  <small aria-label={`Скачано всеми устройствами за ${trafficRangeLabel(trafficRange)} ${bytes(totals.downloadBytes)}`}>
                    {bytes(totals.downloadBytes)} за {trafficRangeLabel(trafficRange)}
                  </small>
                </span>
                <span className="wireguard-peer__traffic-value">
                  <span
                    className="wireguard-traffic wireguard-traffic--upload"
                    aria-label={`Суммарная скорость отдачи ${speed(totals.uploadSpeed)}`}
                  >
                    <b aria-hidden="true">↑</b> {speed(totals.uploadSpeed)}
                  </span>
                  <small aria-label={`Отдано всеми устройствами за ${trafficRangeLabel(trafficRange)} ${bytes(totals.uploadBytes)}`}>
                    {bytes(totals.uploadBytes)} за {trafficRangeLabel(trafficRange)}
                  </small>
                </span>
              </div>
              <Segmented<WireGuardPeerMetricsRange>
                value={trafficRange}
                options={trafficRangeOptions}
                onChange={setTrafficRange}
                aria-label="Период трафика на главном экране"
              />
            </section>

            <div className="wireguard-peer-list" role="list" aria-label="Устройства">
              {peers.map((peer) => {
                const presence = peerPresence(peer, now);
                const download = bytes(peer.traffic.downloadBytes);
                const upload = bytes(peer.traffic.uploadBytes);
                return (
                  <article className="wireguard-peer" role="listitem" key={peer.id}>
                    <div className="wireguard-peer__identity">
                      <strong>{peer.name}</strong>
                      <code>{peer.assignedIp}</code>
                    </div>
                    <span className={`wireguard-status wireguard-status--${presence.tone}`}>
                      <i aria-hidden="true" /> {presence.label}
                    </span>
                    <div className="wireguard-peer__traffic">
                      <span className="wireguard-peer__traffic-value">
                        <span
                          className="wireguard-traffic wireguard-traffic--download"
                          aria-label={`Текущая скорость скачивания ${speed(peer.currentDownloadBytesPerSecond)}`}
                        >
                          <b aria-hidden="true">↓</b> {speed(peer.currentDownloadBytesPerSecond)}
                        </span>
                        <small aria-label={`Скачано за ${trafficRangeLabel(trafficRange)} ${download}`}>
                          {download} за {trafficRangeLabel(trafficRange)}
                        </small>
                      </span>
                      <span className="wireguard-peer__traffic-value">
                        <span
                          className="wireguard-traffic wireguard-traffic--upload"
                          aria-label={`Текущая скорость отдачи ${speed(peer.currentUploadBytesPerSecond)}`}
                        >
                          <b aria-hidden="true">↑</b> {speed(peer.currentUploadBytesPerSecond)}
                        </span>
                        <small aria-label={`Отдано за ${trafficRangeLabel(trafficRange)} ${upload}`}>
                          {upload} за {trafficRangeLabel(trafficRange)}
                        </small>
                      </span>
                    </div>
                    <PeerTrafficPreview
                      peerName={peer.name}
                      metrics={metricPreviews[peer.id]}
                      range={trafficRange}
                      maximum={previewMaximum}
                      onOpen={() => setMetricsPeer(peer)}
                    />
                    <div className="wireguard-peer__actions">
                      <Dropdown
                        trigger={["click"]}
                        menu={{
                          items: [
                            { key: "config", icon: <KeyOutlined />, label: "Показать конфиг" },
                            { key: "enabled", label: peer.enabled ? "Отключить" : "Включить" },
                            { type: "divider" },
                            { key: "delete", icon: <DeleteOutlined />, label: "Удалить", danger: true },
                          ],
                          onClick: ({ key }) => {
                            if (key === "config") void showCredentials(peer);
                            if (key === "enabled") void setPeerEnabled(peer, !peer.enabled);
                            if (key === "delete") confirmDeletePeer(peer);
                          },
                        }}
                      >
                        <Button type="text" icon={<EllipsisOutlined />} aria-label={`Действия ${peer.name}`} />
                      </Dropdown>
                    </div>
                  </article>
                );
              })}
              <article className="wireguard-peer-add" role="listitem">
                <button
                  type="button"
                  disabled={selected.status === "WAITING_FOR_AGENT"}
                  onClick={() => setCreatePeerOpen(true)}
                  aria-label="Добавить устройство"
                >
                  <span className="wireguard-peer-add__icon" aria-hidden="true"><PlusOutlined /></span>
                  <span>
                    <strong>Добавить устройство</strong>
                    <small>Создать новый WireGuard-профиль</small>
                  </span>
                </button>
              </article>
            </div>

            <details className="wireguard-infrastructure">
              <summary>Инфраструктура</summary>
              <dl>
                <div><dt>Публичный адрес VPN</dt><dd><code>{selected.publicEndpoint}</code></dd></div>
                <div><dt>Адресная сеть устройств (CIDR)</dt><dd><code>{selected.clientCidr}</code></dd></div>
                <div><dt>DNS устройств</dt><dd><code>{selected.clientDns}</code></dd></div>
                <div><dt>Ревизия агента</dt><dd>{selected.appliedRevision ?? "—"} / {selected.desiredRevision}</dd></div>
                <div><dt>Heartbeat</dt><dd>{date(selected.lastSeenAt)}</dd></div>
                <div><dt>RU-префиксов</dt><dd>{selected.ruPrefixCount.toLocaleString("ru-RU")}</dd></div>
                <div className="wireguard-infrastructure__wide"><dt>Server key</dt><dd>{selected.serverPublicKey ? (
                  <Typography.Text
                    className="wireguard-server-key"
                    copyable={{ text: selected.serverPublicKey }}
                    ellipsis={{ tooltip: selected.serverPublicKey }}
                  >
                    {selected.serverPublicKey}
                  </Typography.Text>
                ) : "—"}</dd></div>
              </dl>
              <div className="wireguard-infrastructure__actions">
                <Button onClick={async () => {
                  try { setAgentToken((await rotateWireGuardAgentToken(selected.id)).agentToken); }
                  catch (error) { message.error(errorMessage(error, "Не удалось сменить токен")); }
                }}>Сменить agent token</Button>
                <Button danger onClick={() => modal.confirm({
                  title: "Удалить relay?",
                  content: "Это возможно только после удаления всех устройств.",
                  okText: "Удалить",
                  okButtonProps: { danger: true },
                  cancelText: "Отмена",
                  onOk: async () => {
                    await deleteWireGuardRelay(selected.id);
                    snapshotGeneration.current += 1;
                    setRelays([]);
                    setPeers([]);
                    setMetricPreviews({});
                    setExitHealthHistory(null);
                  },
                })}>Удалить relay</Button>
              </div>
            </details>
          </>
        ) : loadFailure ? (
          <div className="wireguard-empty wireguard-load-error" role="alert">
            <strong>VPN API временно недоступен</strong>
            <span>{loadFailure}</span>
            <Button onClick={() => void loadRelays()}>Повторить</Button>
          </div>
        ) : (
          <div className="wireguard-empty">
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="VPN ещё не настроен" />
            <Button type="primary" onClick={() => setCreateRelayOpen(true)}>Настроить relay</Button>
          </div>
        )}
      </section>

      <Modal
        open={createPeerOpen}
        title="Добавить устройство"
        okText="Создать и показать конфиг"
        cancelText="Отмена"
        okButtonProps={{ disabled: !peerName.trim() }}
        onOk={() => void createPeer()}
        onCancel={() => { setCreatePeerOpen(false); setPeerName(""); }}
        destroyOnHidden
      >
        <Input
          autoFocus
          aria-label="Название устройства"
          value={peerName}
          maxLength={120}
          placeholder="Название устройства"
          onChange={(event) => setPeerName(event.target.value)}
          onPressEnter={() => void createPeer()}
        />
      </Modal>
      <Modal open={createRelayOpen} title="Настроить WireGuard relay" footer={null} onCancel={() => setCreateRelayOpen(false)}>
        <Form
          form={relayForm}
          layout="vertical"
          onFinish={(values) => void createRelay(values)}
          initialValues={{ name: "utils → veesp", publicEndpoint: "utils.alexeyav.ru:51820", clientCidr: "10.89.0.0/24", clientDns: "1.1.1.1" }}
        >
          <Form.Item name="name" label="Название" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="publicEndpoint" label="Публичный адрес VPN" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="clientCidr" label="Адресная сеть устройств (CIDR)" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="clientDns" label="DNS" rules={[{ required: true }]}><Input /></Form.Item>
          <Button type="primary" htmlType="submit">Создать</Button>
        </Form>
      </Modal>
      <Modal open={agentToken !== null} title="Одноразовый agent token" onCancel={() => setAgentToken(null)} onOk={() => setAgentToken(null)}>
        <Typography.Paragraph type="warning">Сохраните в root-only файл: после закрытия API его больше не покажет.</Typography.Paragraph>
        <Input.TextArea readOnly rows={3} value={agentToken ?? ""} />
      </Modal>
      <WireGuardCredentialsModal open={credentials !== null} credentials={credentials} onClose={() => setCredentials(null)} />
      <WireGuardPeerMetricsDrawer relayId={selected?.id ?? null} peer={metricsPeer} onClose={() => setMetricsPeer(null)} />
    </PageLayout>
  );
}
