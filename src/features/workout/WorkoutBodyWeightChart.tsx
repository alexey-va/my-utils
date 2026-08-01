import { memo, useMemo, useState, type KeyboardEvent } from "react";
import { Empty, Segmented, Spin, Statistic } from "antd";
import { ExpandAltOutlined } from "@ant-design/icons";
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
import { WorkoutHealthDetailsModal } from "./WorkoutHealthDetailsModal";
import { useWorkoutLocale } from "./workoutLocale";

const CHART_HEIGHT = 200;
const WEIGHT_LINE_COLOR = linearTokens.semanticBlue;

export type WeightPeriod = "p7" | "p14" | "p31" | "all";

type ChartRow = {
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

type Props = {
  days: HealthBodyWeightDay[];
  latestWeightKg: number | null;
  latestDate: string | null;
  loading: boolean;
  period: WeightPeriod;
  onPeriodChange: (period: WeightPeriod) => void;
};

function WorkoutBodyWeightChart({
  days,
  latestWeightKg,
  latestDate,
  loading,
  period,
  onPeriodChange,
}: Props) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { formatDate, formatNumber, t } = useWorkoutLocale();
  const filtered = useMemo(() => filterByPeriod(days, period), [days, period]);
  const chartData = useMemo<ChartRow[]>(
    () => filtered.map((day) => ({ date: day.date, weightKg: Number(day.weightKg) })),
    [filtered],
  );
  const hasChart = chartData.length > 0;
  const periodOptions = useMemo(
    () => [
      { label: t("period.days", { count: 7 }), value: "p7" },
      { label: t("period.days", { count: 14 }), value: "p14" },
      { label: t("period.days", { count: 31 }), value: "p31" },
      { label: t("common.all"), value: "all" },
    ],
    [t],
  );
  const periodLabel = periodOptions.find((option) => option.value === period)?.label ?? period;
  const avgWeight = useMemo(() => {
    if (filtered.length === 0) {
      return null;
    }
    return Math.round(
      (filtered.reduce((sum, day) => sum + Number(day.weightKg), 0) / filtered.length) * 10,
    ) / 10;
  }, [filtered]);
  const delta = useMemo(() => {
    if (filtered.length < 2) {
      return null;
    }
    return Math.round(
      (Number(filtered[filtered.length - 1].weightKg) - Number(filtered[0].weightKg)) * 10,
    ) / 10;
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
      function WeightXAxisTick(props: {
        x?: number;
        y?: number;
        payload?: { value?: string };
      }) {
        const { x = 0, y = 0, payload } = props;
        if (!payload?.value) {
          return <g />;
        }
        return (
          <g transform={`translate(${x},${y})`}>
            <text x={0} y={0} dy={10} textAnchor="middle" fill={linearTokens.inkMuted} fontSize={9}>
              {formatDate(payload.value, { weekday: "short" })}
            </text>
            <text x={0} y={0} dy={22} textAnchor="middle" fill={linearTokens.inkMuted} fontSize={10}>
              {formatDate(payload.value, {
                day: "numeric",
                month: "short",
                ...(period === "all" ? { year: "2-digit" as const } : {}),
              })}
            </text>
          </g>
        );
      },
    [formatDate, period],
  );

  const renderChart = (height: number | "100%") => (
    <ResponsiveContainer width="100%" height={height} debounce={0}>
      <LineChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 20 }}>
        <CartesianGrid stroke={linearTokens.hairline} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tick={renderXAxisTick}
          tickMargin={2}
          height={36}
          interval={xAxisInterval}
        />
        <YAxis
          tick={{ fill: linearTokens.inkMuted, fontSize: 11 }}
          width={50}
          tickMargin={4}
          domain={yDomain}
          tickFormatter={(value: number) => formatNumber(value)}
        />
        <RechartsTooltip
          content={({ active, payload }) => {
            const row = payload?.[0]?.payload as ChartRow | undefined;
            if (!active || !row) {
              return null;
            }
            return (
              <div className="workout-chart-tooltip">
                <p className="workout-chart-tooltip__label">
                  {formatDate(row.date, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                <ul className="workout-chart-tooltip__list">
                  <li className="workout-chart-tooltip__row">
                    <span className="workout-chart-tooltip__swatch" style={{ background: WEIGHT_LINE_COLOR }} />
                    <span className="workout-chart-tooltip__name">{t("common.weight")}</span>
                    <span className="workout-chart-tooltip__value">
                      {formatNumber(row.weightKg)} {t("common.kg")}
                    </span>
                  </li>
                </ul>
              </div>
            );
          }}
          cursor={{ stroke: linearTokens.accentTint }}
        />
        {avgWeight != null ? (
          <ReferenceLine
            y={avgWeight}
            stroke={linearTokens.inkMuted}
            strokeDasharray="5 4"
            strokeWidth={1}
            label={{
              value: t("common.average"),
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
  );

  const openDetailsFromKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setDetailsOpen(true);
    }
  };
  const periodControl = (
    <Segmented
      className="workout-steps__period"
      value={period}
      options={periodOptions}
      onChange={(value) => onPeriodChange(String(value) as WeightPeriod)}
    />
  );
  const latestLabel = latestDate
    ? formatDate(latestDate, { day: "numeric", month: "short" })
    : null;

  return (
    <div className="workout-steps workout-weight">
      <div className="workout-steps__header">
        <div className="workout-steps__header-text">
          <h2 className="workout-steps__title">{t("weight.title")}</h2>
          <p className="workout-steps__hint">{t("weight.hint")}</p>
        </div>
      </div>

      <div className="workout-steps__stats workout-weight__stats">
        <Statistic
          title={latestLabel ? `${t("common.latest")} (${latestLabel})` : t("common.latest")}
          value={latestWeightKg != null ? formatNumber(Number(latestWeightKg)) : "—"}
          suffix={latestWeightKg != null ? t("common.kg") : undefined}
        />
        <Statistic
          title={`${t("common.average")} (${periodLabel})`}
          value={avgWeight != null ? formatNumber(avgWeight) : "—"}
          suffix={avgWeight != null ? t("common.kg") : undefined}
        />
        <Statistic
          title={t("weight.deltaPeriod")}
          value={delta != null ? `${delta > 0 ? "+" : ""}${formatNumber(delta)}` : "—"}
          suffix={delta != null ? t("common.kg") : undefined}
        />
      </div>

      <div className="workout-steps__controls">{periodControl}</div>

      <div
        className="workout-steps__chart-trigger"
        role="button"
        tabIndex={hasChart ? 0 : -1}
        aria-label={t("common.expand")}
        aria-disabled={!hasChart}
        onClick={() => hasChart && setDetailsOpen(true)}
        onKeyDown={openDetailsFromKeyboard}
      >
        <span className="workout-steps__expand-icon" aria-hidden>
          <ExpandAltOutlined />
        </span>
        <div className="workout-steps__chart">
          {loading && !hasChart ? (
            <div className="workout-steps__chart-placeholder">
              <Spin size="small" />
            </div>
          ) : !hasChart ? (
            <Empty description={t("weight.empty")} />
          ) : (
            <div className="workout-steps__chart-inner">{renderChart(CHART_HEIGHT)}</div>
          )}
        </div>
      </div>

      <WorkoutHealthDetailsModal
        open={detailsOpen}
        title={t("weight.detailsTitle")}
        valueLabel={t("common.weight")}
        rows={chartData.map((row) => ({
          date: row.date,
          value: `${formatNumber(row.weightKg)} ${t("common.kg")}`,
        }))}
        controls={periodControl}
        chart={renderChart("100%")}
        onClose={() => setDetailsOpen(false)}
      />
    </div>
  );
}

export default memo(WorkoutBodyWeightChart);
