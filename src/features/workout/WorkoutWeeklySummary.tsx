import {
  CalendarOutlined,
  RiseOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import type { WeeklySummary } from "./workoutAnalytics";
import { useWorkoutLocale } from "./workoutLocale";

export default function WorkoutWeeklySummary({
  summary,
  loading,
}: {
  summary: WeeklySummary;
  loading?: boolean;
}) {
  const { t, formatNumber } = useWorkoutLocale();
  const volumeDelta = summary.thisWeekVolume - summary.lastWeekVolume;
  const daysDelta = summary.thisWeekDays - summary.lastWeekDays;
  const signed = (value: number) =>
    `${value > 0 ? "+" : ""}${formatNumber(value)}`;
  return (
    <section
      className="workout-weekly"
      aria-label={t("overview.week")}
      aria-busy={loading}
    >
      <article className="workout-stat">
        <div className="workout-stat__top">
          <span>{t("weekly.days")}</span>
          <span className="workout-stat__icon">
            <CalendarOutlined />
          </span>
        </div>
        <div className="workout-stat__value">
          {loading ? "—" : summary.thisWeekDays}
          <small>{t("weekly.daysSuffix")}</small>
        </div>
        <div className="workout-stat__caption">
          {loading
            ? t("common.loading")
            : `${signed(daysDelta)} ${t("weekly.vsLast")}`}
        </div>
      </article>
      <article className="workout-stat">
        <div className="workout-stat__top">
          <span>{t("weekly.volume")}</span>
          <span className="workout-stat__icon">
            <ThunderboltOutlined />
          </span>
        </div>
        <div className="workout-stat__value">
          {loading ? "—" : formatNumber(summary.thisWeekVolume)}
          <small>{t("common.kg")}</small>
        </div>
        <div className="workout-stat__caption">{t("overview.volumeHint")}</div>
      </article>
      <article className="workout-stat">
        <div className="workout-stat__top">
          <span>{t("overview.weekComparison")}</span>
          <span className="workout-stat__icon">
            <RiseOutlined />
          </span>
        </div>
        <div
          className={`workout-stat__value${volumeDelta > 0 ? " workout-stat__positive" : ""}`}
        >
          {loading ? "—" : signed(volumeDelta)}
          <small>{t("common.kg")}</small>
        </div>
        <div className="workout-stat__caption">
          {t("overview.comparisonHint")}
        </div>
      </article>
    </section>
  );
}
