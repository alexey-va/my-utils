import { memo, useMemo, useState, type KeyboardEvent } from "react";
import { Empty, Segmented, Spin, Statistic } from "antd";
import { ExpandAltOutlined } from "@ant-design/icons";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { linearTokens } from "../../design/linearTokens";
import type { HealthStepDay } from "../../api/types";
import { HEALTH_CHART_Y_TICK_COUNT } from "./healthChartAxis";
import { WorkoutHealthDetailsModal } from "./WorkoutHealthDetailsModal";
import { useWorkoutLocale } from "./workoutLocale";

const CHART_HEIGHT = 200;
const STEPS_GOAL = 10_000;
const STEPS_BAR_COLOR = linearTokens.semanticGreen;

export type StepsPeriod = "p7" | "p14" | "p31" | "all";

type ChartRow = {
  date: string;
  steps: number;
};

function filterByPeriod(days: HealthStepDay[], period: StepsPeriod): HealthStepDay[] {
  if (period === "all" || days.length === 0) {
    return days;
  }
  const limit = period === "p7" ? 7 : period === "p14" ? 14 : 31;
  return days.slice(-limit);
}

type Props = {
  days: HealthStepDay[];
  todaySteps: number | null;
  loading: boolean;
  period: StepsPeriod;
  onPeriodChange: (period: StepsPeriod) => void;
};

function WorkoutStepsChart({ days, todaySteps, loading, period, onPeriodChange }: Props) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { formatDate, formatNumber, t } = useWorkoutLocale();
  const filtered = useMemo(() => filterByPeriod(days, period), [days, period]);
  const chartData = useMemo<ChartRow[]>(
    () => filtered.map((day) => ({ date: day.date, steps: day.steps })),
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
  const avgSteps = useMemo(() => {
    if (filtered.length === 0) {
      return null;
    }
    return Math.round(filtered.reduce((sum, day) => sum + day.steps, 0) / filtered.length);
  }, [filtered]);
  const yMax = useMemo(() => {
    const dataMax = chartData.reduce((max, row) => Math.max(max, row.steps), 0);
    return Math.ceil(Math.max(dataMax, STEPS_GOAL) * 1.08);
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
      function StepsXAxisTick(props: {
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
      <BarChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 20 }}>
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
          tickCount={HEALTH_CHART_Y_TICK_COUNT}
          allowDecimals={false}
          domain={[0, yMax]}
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
                    <span className="workout-chart-tooltip__swatch" style={{ background: STEPS_BAR_COLOR }} />
                    <span className="workout-chart-tooltip__name">{t("common.steps")}</span>
                    <span className="workout-chart-tooltip__value">{formatNumber(row.steps)}</span>
                  </li>
                </ul>
              </div>
            );
          }}
          cursor={{ fill: linearTokens.accentTint }}
        />
        <ReferenceLine
          y={STEPS_GOAL}
          stroke={linearTokens.inkMuted}
          strokeDasharray="5 4"
          strokeWidth={1}
          label={{
            value: "10k",
            position: "insideTopRight",
            fill: linearTokens.inkMuted,
            fontSize: 10,
          }}
        />
        <Bar
          dataKey="steps"
          fill={STEPS_BAR_COLOR}
          radius={[3, 3, 0, 0]}
          isAnimationActive={false}
        />
      </BarChart>
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
      onChange={(value) => onPeriodChange(String(value) as StepsPeriod)}
    />
  );

  return (
    <div className="workout-steps">
      <div className="workout-steps__header">
        <div className="workout-steps__header-text">
          <h2 className="workout-steps__title">{t("steps.title")}</h2>
          <p className="workout-steps__hint">{t("steps.hint")}</p>
        </div>
      </div>

      <div className="workout-steps__stats">
        <Statistic
          title={t("steps.today")}
          value={todaySteps ?? "—"}
          suffix={todaySteps != null ? t("steps.unit") : undefined}
        />
        <Statistic
          title={`${t("common.average")} (${periodLabel})`}
          value={avgSteps ?? "—"}
          suffix={avgSteps != null ? t("steps.unit") : undefined}
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
            <Empty description={t("steps.empty")} />
          ) : (
            <div className="workout-steps__chart-inner">{renderChart(CHART_HEIGHT)}</div>
          )}
        </div>
      </div>

      <WorkoutHealthDetailsModal
        open={detailsOpen}
        title={t("steps.detailsTitle")}
        valueLabel={t("common.steps")}
        rows={chartData.map((row) => ({
          date: row.date,
          value: formatNumber(row.steps),
        }))}
        controls={periodControl}
        chart={renderChart("100%")}
        onClose={() => setDetailsOpen(false)}
      />
    </div>
  );
}

export default memo(WorkoutStepsChart);
