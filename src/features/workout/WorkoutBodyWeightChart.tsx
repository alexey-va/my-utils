import { memo, useMemo } from "react";
import { Empty, Segmented, Spin, Statistic } from "antd";
import dayjs from "dayjs";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { linearTokens } from "../../design/linearTokens";
import type { HealthBodyWeightDay } from "../../api/types";

const CHART_HEIGHT = 200;
const WEIGHT_LINE_COLOR = linearTokens.semanticBlue;

export type WeightPeriod = "p7" | "p14" | "p31" | "all";

const PERIOD_OPTIONS: { label: string; value: WeightPeriod }[] = [
  { label: "7 d", value: "p7" },
  { label: "14 d", value: "p14" },
  { label: "31 d", value: "p31" },
  { label: "All", value: "all" },
];

type ChartRow = {
  label: string;
  weekday: string;
  dateLabel: string;
  date: string;
  weightKg: number;
};

function filterByPeriod(days: HealthBodyWeightDay[], period: WeightPeriod): HealthBodyWeightDay[] {
  if (period === "all" || days.length === 0) {
    return days;
  }
  const limit = period === "p7" ? 7 : period === "p14" ? 14 : 31;
  return days.slice(-limit);
}

function toChartRows(days: HealthBodyWeightDay[]): ChartRow[] {
  return days.map((day) => {
    const d = dayjs(day.date);
    const dateLabel = d.format("D MMM");
    return {
      date: day.date,
      weekday: d.format("ddd"),
      dateLabel,
      label: `${d.format("ddd")} ${dateLabel}`,
      weightKg: Number(day.weightKg),
    };
  });
}

function formatKg(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

type Props = {
  days: HealthBodyWeightDay[];
  latestWeightKg: number | null;
  latestDate: string | null;
  loading: boolean;
  period: WeightPeriod;
  onPeriodChange: (period: WeightPeriod) => void;
};

function WeightTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: ChartRow }>;
}) {
  if (!active || !payload?.length) {
    return null;
  }
  const row = payload[0]?.payload;
  if (!row) {
    return null;
  }
  return (
    <div className="workout-chart-tooltip">
      <p className="workout-chart-tooltip__label">
        {dayjs(row.date).format("ddd, D MMM YYYY")}
      </p>
      <ul className="workout-chart-tooltip__list">
        <li className="workout-chart-tooltip__row">
          <span className="workout-chart-tooltip__swatch" style={{ background: WEIGHT_LINE_COLOR }} />
          <span className="workout-chart-tooltip__name">Weight</span>
          <span className="workout-chart-tooltip__value">{formatKg(row.weightKg)} kg</span>
        </li>
      </ul>
    </div>
  );
}

function WorkoutBodyWeightChart({
  days,
  latestWeightKg,
  latestDate,
  loading,
  period,
  onPeriodChange,
}: Props) {
  const filtered = useMemo(() => filterByPeriod(days, period), [days, period]);
  const chartData = useMemo(() => toChartRows(filtered), [filtered]);
  const hasChart = chartData.length > 0;

  const avgWeight = useMemo(() => {
    if (filtered.length === 0) {
      return null;
    }
    const total = filtered.reduce((sum, day) => sum + Number(day.weightKg), 0);
    return Math.round((total / filtered.length) * 10) / 10;
  }, [filtered]);

  const delta = useMemo(() => {
    if (filtered.length < 2) {
      return null;
    }
    const first = Number(filtered[0].weightKg);
    const last = Number(filtered[filtered.length - 1].weightKg);
    return Math.round((last - first) * 10) / 10;
  }, [filtered]);

  const yDomain = useMemo((): [number, number] => {
    if (chartData.length === 0) {
      return [0, 100];
    }
    const values = chartData.map((row) => row.weightKg);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = Math.max(1, (max - min) * 0.15);
    return [Math.floor(min - pad), Math.ceil(max + pad)];
  }, [chartData]);

  const xAxisInterval = useMemo(() => {
    if (chartData.length <= 7) {
      return 0;
    }
    if (chartData.length <= 14) {
      return 1;
    }
    return "preserveStartEnd" as const;
  }, [chartData.length]);

  const renderXAxisTick = useMemo(
    () =>
      function WeightXAxisTick(props: { x?: number; y?: number; index?: number }) {
        const { x = 0, y = 0, index = 0 } = props;
        const row = chartData[index];
        if (!row) {
          return <g />;
        }
        return (
          <g transform={`translate(${x},${y})`}>
            <text
              x={0}
              y={0}
              dy={10}
              textAnchor="middle"
              fill={linearTokens.inkMuted}
              fontSize={9}
            >
              {row.weekday}
            </text>
            <text
              x={0}
              y={0}
              dy={22}
              textAnchor="middle"
              fill={linearTokens.inkMuted}
              fontSize={10}
            >
              {row.dateLabel}
            </text>
          </g>
        );
      },
    [chartData],
  );

  const latestLabel =
    latestDate != null ? dayjs(latestDate).format("D MMM") : null;

  return (
    <div className="workout-steps workout-weight">
      <div className="workout-steps__header">
        <div className="workout-steps__header-text">
          <h2 className="workout-steps__title">Body weight</h2>
          <p className="workout-steps__hint">Telegram bot or API</p>
        </div>
      </div>

      <div className="workout-steps__stats workout-weight__stats">
        <Statistic
          title={latestLabel ? `Latest (${latestLabel})` : "Latest"}
          value={latestWeightKg != null ? formatKg(Number(latestWeightKg)) : "—"}
          suffix={latestWeightKg != null ? "kg" : undefined}
        />
        <Statistic
          title={`Avg (${PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? period})`}
          value={avgWeight != null ? formatKg(avgWeight) : "—"}
          suffix={avgWeight != null ? "kg" : undefined}
        />
        <Statistic
          title="Δ period"
          value={delta != null ? `${delta > 0 ? "+" : ""}${formatKg(delta)}` : "—"}
          suffix={delta != null ? "kg" : undefined}
        />
      </div>

      <div className="workout-steps__controls">
        <Segmented
          className="workout-steps__period"
          value={period}
          options={PERIOD_OPTIONS}
          onChange={(value) => onPeriodChange(String(value) as WeightPeriod)}
        />
      </div>

      <div className="workout-steps__chart">
        {loading && !hasChart ? (
          <div className="workout-steps__chart-placeholder">
            <Spin size="small" />
          </div>
        ) : !hasChart ? (
          <Empty description="No weight yet — tell the bot «вес 82.5»" />
        ) : (
          <div className="workout-steps__chart-inner">
            <ResponsiveContainer width="100%" height={CHART_HEIGHT} debounce={0}>
              <LineChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 20 }}>
                <CartesianGrid stroke={linearTokens.hairline} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={renderXAxisTick}
                  tickMargin={2}
                  height={36}
                  interval={xAxisInterval}
                />
                <YAxis
                  tick={{ fill: linearTokens.inkMuted, fontSize: 11 }}
                  width={44}
                  tickMargin={4}
                  domain={yDomain}
                  tickFormatter={(v: number) => formatKg(v)}
                />
                <RechartsTooltip content={<WeightTooltip />} cursor={{ stroke: linearTokens.accentTint }} />
                {avgWeight != null ? (
                  <ReferenceLine
                    y={avgWeight}
                    stroke={linearTokens.inkMuted}
                    strokeDasharray="5 4"
                    strokeWidth={1}
                    label={{
                      value: "avg",
                      position: "insideTopRight",
                      fill: linearTokens.inkMuted,
                      fontSize: 10,
                    }}
                  />
                ) : null}
                <Line
                  type="monotone"
                  dataKey="weightKg"
                  stroke={WEIGHT_LINE_COLOR}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: WEIGHT_LINE_COLOR, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(WorkoutBodyWeightChart);
