import { FullscreenExitOutlined, UndoOutlined, ZoomInOutlined } from "@ant-design/icons";
import { Button, Empty, Drawer, Segmented, Spin, Tabs, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
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
import {
  selectionToZoomDomain,
  type ChartPoint,
  type ChartSize,
  type ChartZoomDomain,
} from "./chartZoom";
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

const CHART_HEIGHT = 300;
const CHART_INSET = { top: 12, right: 8, bottom: 38, left: 68 };

type DragSelection = {
  start: ChartPoint;
  current: ChartPoint;
  size: ChartSize;
};

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

const formatZoomRatio = (value: number): string => value >= 10 ? Math.round(value).toString() : value.toFixed(1);

export default function WireGuardPeerMetricsDrawer({ relayId, peer, onClose }: Props) {
  const [range, setRange] = useState<WireGuardPeerMetricsRange>("HOUR");
  const [route, setRoute] = useState<MetricsRoute>("RU");
  const [metrics, setMetrics] = useState<WireGuardPeerMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [zoomHistory, setZoomHistory] = useState<ChartZoomDomain[]>([]);
  const [dragSelection, setDragSelection] = useState<DragSelection | null>(null);
  const zoom = zoomHistory.at(-1) ?? null;

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

  useEffect(() => {
    setZoomHistory([]);
    setDragSelection(null);
  }, [metrics?.from, metrics?.to, peer?.id, range]);

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
  const xDomain: [number, number] = zoom?.x ?? [rangeStart, rangeEnd];
  const yDomain: [number, number] = zoom?.y ?? [0, scaleMaximum];
  const visibleFrom = zoom ? new Date(xDomain[0]).toISOString() : metrics?.from ?? "";
  const visibleTo = zoom ? new Date(xDomain[1]).toISOString() : metrics?.to ?? "";
  const formatRangeEdge = (value: number) => new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const plotPoint = (event: ReactPointerEvent<HTMLDivElement>): { point: ChartPoint; size: ChartSize } | null => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const size = {
      width: Math.max(0, bounds.width - CHART_INSET.left - CHART_INSET.right),
      height: Math.max(0, bounds.height - CHART_INSET.top - CHART_INSET.bottom),
    };
    const point = {
      x: event.clientX - bounds.left - CHART_INSET.left,
      y: event.clientY - bounds.top - CHART_INSET.top,
    };
    if (point.x < 0 || point.x > size.width || point.y < 0 || point.y > size.height) return null;
    return { point, size };
  };

  const beginZoom = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const selection = plotPoint(event);
    if (!selection) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragSelection({ start: selection.point, current: selection.point, size: selection.size });
  };

  const updateZoom = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragSelection) return;
    const selection = plotPoint(event);
    if (!selection) return;
    setDragSelection((current) => current ? { ...current, current: selection.point } : null);
  };

  const finishZoom = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragSelection) return;
    const selection = plotPoint(event);
    const nextZoom = selectionToZoomDomain(
      dragSelection.start,
      selection?.point ?? dragSelection.current,
      dragSelection.size,
      { x: xDomain, y: yDomain },
    );
    if (nextZoom) setZoomHistory((current) => [...current, nextZoom]);
    setDragSelection(null);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const undoZoom = () => setZoomHistory((current) => current.slice(0, -1));
  const resetZoom = () => {
    setZoomHistory([]);
    setDragSelection(null);
  };

  const dragDomain = dragSelection ? selectionToZoomDomain(
    dragSelection.start,
    dragSelection.current,
    dragSelection.size,
    { x: xDomain, y: yDomain },
  ) : null;
  const zoomXRatio = zoom && rangeEnd > rangeStart
    ? (rangeEnd - rangeStart) / Math.max(1, xDomain[1] - xDomain[0])
    : 1;
  const zoomYRatio = zoom
    ? scaleMaximum / Math.max(1, yDomain[1] - yDomain[0])
    : 1;

  const selectionStyle = dragSelection ? {
    left: CHART_INSET.left + Math.min(dragSelection.start.x, dragSelection.current.x),
    top: CHART_INSET.top + Math.min(dragSelection.start.y, dragSelection.current.y),
    width: Math.abs(dragSelection.current.x - dragSelection.start.x),
    height: Math.abs(dragSelection.current.y - dragSelection.start.y),
  } : undefined;

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
      <div className="wireguard-chart__zoom-toolbar">
        <span className="wireguard-chart__zoom-state" aria-live="polite">
          <ZoomInOutlined aria-hidden="true" />
          {dragDomain
            ? `Выбрано: ${formatRangeEdge(dragDomain.x[0])} — ${formatRangeEdge(dragDomain.x[1])} · ${formatBytes(dragDomain.y[0])} — ${formatBytes(dragDomain.y[1])}`
            : zoom
              ? `Приближение ×${formatZoomRatio(zoomXRatio)} по времени · ×${formatZoomRatio(zoomYRatio)} по объёму`
              : "Потяните рамку по графику, чтобы приблизить"}
        </span>
        {zoomHistory.length > 0 ? (
          <span className="wireguard-chart__zoom-actions">
            <Button type="text" size="small" icon={<UndoOutlined />} onClick={undoZoom} aria-label="Назад по масштабу">
              Назад
            </Button>
            <Button type="text" size="small" icon={<FullscreenExitOutlined />} onClick={resetZoom} aria-label="Показать весь период">
              Весь период
            </Button>
          </span>
        ) : null}
      </div>
      <div className="wireguard-chart" aria-label={`Гистограмма трафика, общая шкала до ${formatBytes(scaleMaximum)}`}>
        {loading ? (
          <Spin />
        ) : rows.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="За этот период трафика ещё нет" />
        ) : (
          <>
          <div
            className={`wireguard-chart__plot${dragSelection ? " wireguard-chart__plot--dragging" : ""}`}
            aria-label={`Интерактивный график ${routeLabel}`}
            onPointerDown={beginZoom}
            onPointerMove={updateZoom}
            onPointerUp={finishZoom}
            onPointerCancel={() => setDragSelection(null)}
            onDoubleClick={resetZoom}
            onKeyDown={(event) => { if (event.key === "Escape") resetZoom(); }}
            tabIndex={0}
          >
          <ResponsiveContainer width="100%" height={CHART_HEIGHT} debounce={0}>
            <BarChart data={rows} margin={{ top: 12, right: 8, bottom: 8, left: 4 }} barGap={2} barCategoryGap="18%">
              <CartesianGrid stroke={linearTokens.hairlineStrong} vertical strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                type="number"
                domain={xDomain}
                ticks={[xDomain[0], xDomain[0] + (xDomain[1] - xDomain[0]) / 2, xDomain[1]]}
                allowDataOverflow
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
                domain={yDomain}
                allowDataOverflow
                axisLine={{ stroke: linearTokens.hairlineStrong }}
                tickLine={{ stroke: linearTokens.hairlineStrong }}
                tick={{ fill: linearTokens.inkMuted, fontSize: 11 }}
                tickFormatter={formatBytes}
              />
              {!dragSelection ? <Tooltip
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
              /> : null}
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
          {dragSelection ? (
            <span
              className="wireguard-chart__selection"
              style={selectionStyle}
              aria-label="Выбранная область масштаба"
            />
          ) : null}
          </div>
          <div className="wireguard-chart__time-range">
            <span aria-label={`Начало периода ${visibleFrom}`}>
              <small>Начало</small>{formatRangeEdge(xDomain[0])}
            </span>
            <span aria-label={`Конец периода ${visibleTo}`}>
              <small>Конец</small>{formatRangeEdge(xDomain[1])}
            </span>
          </div>
          </>
        )}
      </div>
    </Drawer>
  );
}
