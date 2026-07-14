import { memo, useMemo } from "react";
import { Empty, Segmented, Spin, Statistic } from "antd";
import dayjs from "dayjs";
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

const CHART_HEIGHT = 200;
const STEPS_GOAL = 10_000;
const STEPS_BAR_COLOR = linearTokens.semanticGreen;

export type StepsPeriod = "p7" | "p14" | "p31" | "all";

const PERIOD_OPTIONS: { label: string; value: StepsPeriod }[] = [
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
  steps: number;
};

function filterByPeriod(days: HealthStepDay[], period: StepsPeriod): HealthStepDay[] {
  if (period === "all" || days.length === 0) {
    return days;
  }
  const limit =
    period === "p7" ? 7 : period === "p14" ? 14 : 31;
  return days.slice(-limit);
}

function toChartRows(days: HealthStepDay[]): ChartRow[] {
  return days.map((day) => {
    const d = dayjs(day.date);
    const dateLabel = d.format("D MMM");
    return {
      date: day.date,
      weekday: d.format("ddd"),
      dateLabel,
      label: `${d.format("ddd")} ${dateLabel}`,
      steps: day.steps,
    };
  });
}

type Props = {
  days: HealthStepDay[];
  todaySteps: number | null;
  loading: boolean;
  period: StepsPeriod;
  onPeriodChange: (period: StepsPeriod) => void;
};

function StepsTooltip({
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
          <span className="workout-chart-tooltip__swatch" style={{ background: STEPS_BAR_COLOR }} />
          <span className="workout-chart-tooltip__name">Steps</span>
          <span className="workout-chart-tooltip__value">{row.steps.toLocaleString()}</span>
        </li>
      </ul>
    </div>
  );
}

function WorkoutStepsChart({ days, todaySteps, loading, period, onPeriodChange }: Props) {
  const filtered = useMemo(() => filterByPeriod(days, period), [days, period]);
  const chartData = useMemo(() => toChartRows(filtered), [filtered]);
  const hasChart = chartData.length > 0;
  const avgSteps = useMemo(() => {
    if (filtered.length === 0) {
      return null;
    }
    const total = filtered.reduce((sum, day) => sum + day.steps, 0);
    return Math.round(total / filtered.length);
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
      function StepsXAxisTick({
        x = 0,
        y = 0,
        index = 0,
      }: {
        x?: number;
        y?: number;
        index?: number;
      }) {
        const row = chartData[index];
        if (!row) {
          return null;
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

  return (
    <div className="workout-steps">
      <div className="workout-steps__header">
        <div className="workout-steps__header-text">
          <h2 className="workout-steps__title">Steps</h2>
          <p className="workout-steps__hint">Apple Health via Shortcut</p>
        </div>
      </div>

      <div className="workout-steps__stats">
        <Statistic
          title="Today"
          value={todaySteps ?? "—"}
          suffix={todaySteps != null ? "steps" : undefined}
        />
        <Statistic
          title={`Avg (${PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? period})`}
          value={avgSteps ?? "—"}
          suffix={avgSteps != null ? "steps" : undefined}
        />
      </div>

      <div className="workout-steps__controls">
        <Segmented
          className="workout-steps__period"
          value={period}
          options={PERIOD_OPTIONS}
          onChange={(value) => onPeriodChange(String(value) as StepsPeriod)}
        />
      </div>

      <div className="workout-steps__chart">
        {loading && !hasChart ? (
          <div className="workout-steps__chart-placeholder">
            <Spin size="small" />
          </div>
        ) : !hasChart ? (
          <Empty description="No steps yet — run the Shortcut on iPhone" />
        ) : (
          <div className="workout-steps__chart-inner">
            <ResponsiveContainer width="100%" height={CHART_HEIGHT} debounce={0}>
              <BarChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 20 }}>
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
                  allowDecimals={false}
                  domain={[0, yMax]}
                />
                <RechartsTooltip content={<StepsTooltip />} cursor={{ fill: linearTokens.accentTint }} />
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
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(WorkoutStepsChart);
