import { Empty, Drawer, Segmented, Spin, Tabs, message } from "antd";
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

type MetricsRoute = "RU" | "EXTERNAL";

const routeTabs: Array<{ label: string; key: MetricsRoute }> = [
  { label: "RU", key: "RU" },
  { label: "Внешние", key: "EXTERNAL" },
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
  const [route, setRoute] = useState<MetricsRoute>("RU");
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
      setRoute("RU");
      setMetrics(null);
    }
  }, [peer]);

  const rows = useMemo(
    () => metrics?.points.map((point) => ({
      ...point,
      time: new Date(point.bucketStart).getTime(),
    })) ?? [],
    [metrics],
  );
  const scaleMaximum = useMemo(
    () => Math.max(1, ...rows.flatMap((point) => [
      point.ruDownloadBytes,
      point.ruUploadBytes,
      point.nonRuDownloadBytes,
      point.nonRuUploadBytes,
    ])),
    [rows],
  );
  const routeLabel = route === "RU" ? "RU" : "Внешние";
  const routeDownload = route === "RU"
    ? metrics?.summary.ruDownloadBytes ?? 0
    : metrics?.summary.nonRuDownloadBytes ?? 0;
  const routeUpload = route === "RU"
    ? metrics?.summary.ruUploadBytes ?? 0
    : metrics?.summary.nonRuUploadBytes ?? 0;
  const rangeStart = metrics ? new Date(metrics.from).getTime() : 0;
  const rangeEnd = metrics ? new Date(metrics.to).getTime() : 0;
  const formatRangeEdge = (value: number) => new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

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
        <Tabs
          className="wireguard-route-tabs"
          activeKey={route}
          items={routeTabs}
          onChange={(key) => setRoute(key as MetricsRoute)}
        />
        <Segmented<WireGuardPeerMetricsRange>
          block
          name="wireguard-metrics-range"
          value={range}
          options={rangeOptions}
          onChange={setRange}
          aria-label="Период графика"
        />
      </div>
      <div className="wireguard-metrics-summary" aria-live="polite">
        <span
          className="wireguard-traffic wireguard-traffic--download"
          aria-label={`${routeLabel} скачано ${formatBytes(routeDownload)}`}
        >
          ↓ {formatBytes(routeDownload)}
        </span>
        <span
          className="wireguard-traffic wireguard-traffic--upload"
          aria-label={`${routeLabel} отдано ${formatBytes(routeUpload)}`}
        >
          ↑ {formatBytes(routeUpload)}
        </span>
      </div>
      <div className="wireguard-chart" aria-label={`Гистограмма трафика, общая шкала до ${formatBytes(scaleMaximum)}`}>
        {loading ? (
          <Spin />
        ) : rows.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="За этот период трафика ещё нет" />
        ) : (
          <>
          <div className="wireguard-chart__plot">
          <ResponsiveContainer width="100%" height={300} debounce={0}>
            <BarChart data={rows} margin={{ top: 12, right: 8, bottom: 8, left: 4 }} barGap={2} barCategoryGap="18%">
              <CartesianGrid stroke={linearTokens.hairlineStrong} vertical strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                type="number"
                domain={[rangeStart, rangeEnd]}
                ticks={[rangeStart, rangeStart + (rangeEnd - rangeStart) / 2, rangeEnd]}
                axisLine={{ stroke: linearTokens.hairlineStrong }}
                tickLine={{ stroke: linearTokens.hairlineStrong }}
                tick={{ fill: linearTokens.inkMuted, fontSize: 11 }}
                tickFormatter={(value: number) => new Date(value).toLocaleString("ru-RU", {
                  hour: "2-digit",
                  minute: "2-digit",
                  ...(range === "WEEK" || range === "MONTH" ? { day: "2-digit", month: "short" } : {}),
                })}
              />
              <YAxis
                width={64}
                domain={[0, scaleMaximum]}
                allowDataOverflow
                axisLine={{ stroke: linearTokens.hairlineStrong }}
                tickLine={{ stroke: linearTokens.hairlineStrong }}
                tick={{ fill: linearTokens.inkMuted, fontSize: 11 }}
                tickFormatter={formatBytes}
              />
              <Tooltip
                labelFormatter={(value) => new Date(Number(value)).toLocaleString("ru-RU")}
                formatter={(value, name) => {
                  const labels: Record<string, string> = {
                    downloadBytes: "Скачано",
                    uploadBytes: "Отдано",
                    ruDownloadBytes: "RU · скачано",
                    ruUploadBytes: "RU · отдано",
                    nonRuDownloadBytes: "Внешние · скачано",
                    nonRuUploadBytes: "Внешние · отдано",
                  };
                  return [formatBytes(Number(value)), labels[String(name)] ?? String(name)];
                }}
              />
              {route === "RU" && (
                <Bar
                  dataKey="ruDownloadBytes"
                  fill={linearTokens.semanticBlue}
                  fillOpacity={0.84}
                  maxBarSize={12}
                  radius={[2, 2, 0, 0]}
                  isAnimationActive={false}
                />
              )}
              {route === "RU" && (
                <Bar
                  dataKey="ruUploadBytes"
                  fill={linearTokens.semanticGreen}
                  fillOpacity={0.84}
                  maxBarSize={12}
                  radius={[2, 2, 0, 0]}
                  isAnimationActive={false}
                />
              )}
              {route === "EXTERNAL" && (
                <Bar
                  dataKey="nonRuDownloadBytes"
                  fill={linearTokens.semanticBlue}
                  fillOpacity={0.84}
                  maxBarSize={12}
                  radius={[2, 2, 0, 0]}
                  isAnimationActive={false}
                />
              )}
              {route === "EXTERNAL" && (
                <Bar
                  dataKey="nonRuUploadBytes"
                  fill={linearTokens.semanticGreen}
                  fillOpacity={0.84}
                  maxBarSize={12}
                  radius={[2, 2, 0, 0]}
                  isAnimationActive={false}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
          </div>
          <div className="wireguard-chart__time-range">
            <span aria-label={`Начало периода ${metrics?.from ?? ""}`}>
              <small>Начало</small>{formatRangeEdge(rangeStart)}
            </span>
            <span aria-label={`Конец периода ${metrics?.to ?? ""}`}>
              <small>Конец</small>{formatRangeEdge(rangeEnd)}
            </span>
          </div>
          </>
        )}
      </div>
    </Drawer>
  );
}
