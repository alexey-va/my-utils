import { Empty, Drawer, Segmented, Spin, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ApiError } from "../../api/errors";
import { linearTokens } from "../../design/linearTokens";
import { fetchWireGuardPeerMetrics } from "./api";
import type {
  WireGuardPeer,
  WireGuardPeerMetrics,
  WireGuardPeerMetricsRange,
} from "./types";

type Props = {
  relayId: string | null;
  peer: WireGuardPeer | null;
  onClose: () => void;
};

const rangeOptions: Array<{ label: string; value: WireGuardPeerMetricsRange }> = [
  { label: "1ч", value: "HOUR" },
  { label: "24ч", value: "DAY" },
  { label: "7д", value: "WEEK" },
  { label: "30д", value: "MONTH" },
];

type MetricsView = "DIRECTION" | "ROUTE";

const viewOptions: Array<{ label: string; value: MetricsView }> = [
  { label: "↓ / ↑", value: "DIRECTION" },
  { label: "RU / не RU", value: "ROUTE" },
];

const formatBytes = (value: number): string => {
  if (value < 1024) return `${Math.round(value)} B`;
  const units = ["KiB", "MiB", "GiB", "TiB"];
  let amount = value / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && amount >= 1024; index += 1) {
    amount /= 1024;
    unit = units[index];
  }
  return `${amount.toFixed(amount >= 10 ? 1 : 2)} ${unit}`;
};

export default function WireGuardPeerMetricsDrawer({ relayId, peer, onClose }: Props) {
  const [range, setRange] = useState<WireGuardPeerMetricsRange>("HOUR");
  const [view, setView] = useState<MetricsView>("DIRECTION");
  const [metrics, setMetrics] = useState<WireGuardPeerMetrics | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!relayId || !peer) return;
    let active = true;
    setLoading(true);
    void fetchWireGuardPeerMetrics(relayId, peer.id, range)
      .then((next) => { if (active) setMetrics(next); })
      .catch((error: unknown) => {
        if (active) message.error(error instanceof ApiError ? error.message : "Не удалось загрузить историю трафика");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [peer, range, relayId]);

  useEffect(() => {
    if (!peer) {
      setRange("HOUR");
      setView("DIRECTION");
      setMetrics(null);
    }
  }, [peer]);

  const rows = useMemo(
    () => metrics?.points.map((point) => ({
      ...point,
      time: new Date(point.bucketStart).getTime(),
      ruBytes: point.ruDownloadBytes + point.ruUploadBytes,
      nonRuBytes: point.nonRuDownloadBytes + point.nonRuUploadBytes,
    })) ?? [],
    [metrics],
  );
  const totals = useMemo(
    () => rows.reduce(
      (sum, point) => ({
        download: sum.download + point.downloadBytes,
        upload: sum.upload + point.uploadBytes,
        ru: sum.ru + point.ruBytes,
        nonRu: sum.nonRu + point.nonRuBytes,
      }),
      { download: 0, upload: 0, ru: 0, nonRu: 0 },
    ),
    [rows],
  );

  return (
    <Drawer
      open={peer !== null}
      onClose={onClose}
      title={peer ? `Трафик ${peer.name}` : "Трафик"}
      width="min(560px, 100vw)"
      destroyOnHidden
      className="wireguard-metrics-drawer"
    >
      <div className="wireguard-metrics-controls">
        <Segmented<WireGuardPeerMetricsRange>
          block
          name="wireguard-metrics-range"
          value={range}
          options={rangeOptions}
          onChange={setRange}
          aria-label="Период графика"
        />
        <Segmented<MetricsView>
          block
          name="wireguard-metrics-view"
          value={view}
          options={viewOptions}
          onChange={setView}
          aria-label="Разрез графика"
        />
      </div>
      <div className="wireguard-metrics-summary" aria-live="polite">
        {view === "DIRECTION" ? (
          <>
            <span className="wireguard-traffic wireguard-traffic--download">↓ {formatBytes(totals.download)}</span>
            <span className="wireguard-traffic wireguard-traffic--upload">↑ {formatBytes(totals.upload)}</span>
          </>
        ) : (
          <>
            <span className="wireguard-traffic wireguard-traffic--ru" aria-label={`RU трафик ${formatBytes(totals.ru)}`}>
              RU напрямую {formatBytes(totals.ru)}
            </span>
            <span className="wireguard-traffic wireguard-traffic--non-ru" aria-label={`Не RU трафик через Veesp ${formatBytes(totals.nonRu)}`}>
              Не RU · Veesp {formatBytes(totals.nonRu)}
            </span>
          </>
        )}
      </div>
      <div className="wireguard-chart" aria-label="Гистограмма трафика">
        {loading ? (
          <Spin />
        ) : rows.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="За этот период трафика ещё нет" />
        ) : (
          <ResponsiveContainer width="100%" height={300} debounce={0}>
            <BarChart data={rows} margin={{ top: 12, right: 8, bottom: 8, left: 4 }} barGap={2} barCategoryGap="18%">
              <CartesianGrid stroke={linearTokens.hairline} vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                type="number"
                domain={["dataMin", "dataMax"]}
                tick={{ fill: linearTokens.inkMuted, fontSize: 11 }}
                tickFormatter={(value: number) => new Date(value).toLocaleString("ru-RU", {
                  hour: "2-digit",
                  minute: "2-digit",
                  ...(range === "WEEK" || range === "MONTH" ? { day: "2-digit", month: "short" } : {}),
                })}
              />
              <YAxis
                width={64}
                tick={{ fill: linearTokens.inkMuted, fontSize: 11 }}
                tickFormatter={formatBytes}
              />
              <Tooltip
                labelFormatter={(value) => new Date(Number(value)).toLocaleString("ru-RU")}
                formatter={(value, name) => {
                  const labels: Record<string, string> = {
                    downloadBytes: "Скачано",
                    uploadBytes: "Отдано",
                    ruBytes: "RU напрямую",
                    nonRuBytes: "Не RU через Veesp",
                  };
                  return [formatBytes(Number(value)), labels[String(name)] ?? String(name)];
                }}
              />
              {view === "DIRECTION" && (
                <Bar
                  dataKey="downloadBytes"
                  fill={linearTokens.semanticBlue}
                  fillOpacity={0.84}
                  maxBarSize={12}
                  radius={[2, 2, 0, 0]}
                  isAnimationActive={false}
                />
              )}
              {view === "DIRECTION" && (
                <Bar
                  dataKey="uploadBytes"
                  fill={linearTokens.semanticGreen}
                  fillOpacity={0.84}
                  maxBarSize={12}
                  radius={[2, 2, 0, 0]}
                  isAnimationActive={false}
                />
              )}
              {view === "ROUTE" && (
                <Bar
                  dataKey="ruBytes"
                  fill={linearTokens.semanticGreen}
                  fillOpacity={0.84}
                  maxBarSize={12}
                  radius={[2, 2, 0, 0]}
                  isAnimationActive={false}
                />
              )}
              {view === "ROUTE" && (
                <Bar
                  dataKey="nonRuBytes"
                  fill={linearTokens.semanticIndigo}
                  fillOpacity={0.84}
                  maxBarSize={12}
                  radius={[2, 2, 0, 0]}
                  isAnimationActive={false}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Drawer>
  );
}
