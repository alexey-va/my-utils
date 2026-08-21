import { ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart, CartesianGrid } from "recharts";
import { linearTokens } from "../../design/linearTokens";
import type { WireGuardExitHealthHistory, WireGuardExitHealthMetricPoint, WireGuardExitId } from "./types";

type Props = {
  history: WireGuardExitHealthHistory | null;
};

type ChartRow = WireGuardExitHealthMetricPoint & { time: number };

const exitName: Record<WireGuardExitId, string> = {
  primary: "Основной",
  secondary: "Резервный",
};

const exitNameGenitive: Record<WireGuardExitId, string> = {
  primary: "основного",
  secondary: "резервного",
};

function weightedAvailability(points: WireGuardExitHealthMetricPoint[], key: "primaryAvailabilityPercent" | "secondaryAvailabilityPercent") {
  const samples = points.reduce((sum, point) => sum + point.samples, 0);
  if (samples === 0) return 0;
  return points.reduce((sum, point) => sum + point[key] * point.samples, 0) / samples;
}

function percent(value: number) {
  return `${Number(value.toFixed(1))}%`;
}

function timeLabel(value: number) {
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AvailabilityStrip({ rows, exitId }: { rows: ChartRow[]; exitId: WireGuardExitId }) {
  const availabilityKey = exitId === "primary" ? "primaryAvailabilityPercent" : "secondaryAvailabilityPercent";
  const reasonKey = exitId === "primary" ? "primaryFailureReason" : "secondaryFailureReason";
  return (
    <div className="wireguard-health-history__strip-row">
      <span>{exitName[exitId]}</span>
      <div className="wireguard-health-history__strip" role="img" aria-label={`История доступности: ${exitName[exitId].toLowerCase()} exit`}>
        {rows.map((point) => {
          const value = point[availabilityKey];
          const reason = point[reasonKey];
          const tone = value >= 100 ? "healthy" : value <= 0 ? "down" : "degraded";
          return (
            <i
              key={point.bucketStart}
              className={`wireguard-health-history__bucket wireguard-health-history__bucket--${tone}`}
              title={`${timeLabel(point.time)} · ${percent(value)}${reason ? ` · ${reason}` : ""}`}
              aria-label={reason ? `Сбой ${exitNameGenitive[exitId]} exit: ${reason}` : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function WireGuardExitHealthChart({ history }: Props) {
  const rows: ChartRow[] = history?.points.map((point) => ({ ...point, time: new Date(point.bucketStart).getTime() })) ?? [];
  const primaryAvailability = weightedAvailability(rows, "primaryAvailabilityPercent");
  const secondaryAvailability = weightedAvailability(rows, "secondaryAvailabilityPercent");
  const switchedToReserve = rows.some((point, index) => (
    index > 0 && rows[index - 1].activeExit === "primary" && point.activeExit === "secondary"
  ));

  return (
    <section className="wireguard-health-history" role="region" aria-label="История healthcheck туннелей">
      <header>
        <h2>Healthcheck туннелей</h2>
        {rows.length > 0 ? (
          <div className="wireguard-health-history__summary">
            <span aria-label={`Основной exit: доступность ${percent(primaryAvailability)}`}><i className="wireguard-health-history__legend-primary" />Основной {percent(primaryAvailability)}</span>
            <span aria-label={`Резервный exit: доступность ${percent(secondaryAvailability)}`}><i className="wireguard-health-history__legend-secondary" />Резерв {percent(secondaryAvailability)}</span>
          </div>
        ) : null}
      </header>
      {rows.length === 0 ? (
        <p className="wireguard-health-history__empty">История начнёт накапливаться после первого healthcheck.</p>
      ) : (
        <>
          <div className="wireguard-health-history__strips">
            <AvailabilityStrip rows={rows} exitId="primary" />
            <AvailabilityStrip rows={rows} exitId="secondary" />
          </div>
          {switchedToReserve ? <p className="wireguard-health-history__event">Переключение на резервный exit</p> : null}
          <div className="wireguard-health-history__chart" aria-label="Задержка exit-ов во времени">
            <ResponsiveContainer width="100%" height={210} debounce={0}>
              <LineChart data={rows} margin={{ top: 10, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid stroke={linearTokens.hairlineStrong} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="time"
                  type="number"
                  domain={[new Date(history!.from).getTime(), new Date(history!.to).getTime()]}
                  ticks={[new Date(history!.from).getTime(), new Date(history!.to).getTime()]}
                  tickFormatter={timeLabel}
                  tick={{ fill: linearTokens.inkMuted, fontSize: 10 }}
                  axisLine={{ stroke: linearTokens.hairlineStrong }}
                  tickLine={false}
                />
                <YAxis
                  width={48}
                  unit=" мс"
                  tick={{ fill: linearTokens.inkMuted, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  labelFormatter={(value) => timeLabel(Number(value))}
                  formatter={(value: number, name: string) => [`${Number(value).toFixed(1)} мс`, name]}
                  contentStyle={{ background: linearTokens.surface2, border: `1px solid ${linearTokens.hairlineStrong}`, borderRadius: 8 }}
                />
                <Line type="linear" dataKey="primaryAverageLatencyMs" name="Основной" stroke={linearTokens.semanticBlue} strokeWidth={2} dot={false} connectNulls={false} />
                <Line type="linear" dataKey="secondaryAverageLatencyMs" name="Резервный" stroke={linearTokens.semanticGreen} strokeWidth={2} dot={false} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </section>
  );
}
