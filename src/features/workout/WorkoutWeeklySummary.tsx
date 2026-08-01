import { Statistic } from "antd";
import { linearTokens } from "../../design/linearTokens";
import type { WeeklySummary } from "./workoutAnalytics";
import { formatSignedDelta } from "./workoutAnalytics";
import { useWorkoutLocale } from "./workoutLocale";

type Props = {
  summary: WeeklySummary;
};

export default function WorkoutWeeklySummary({ summary }: Props) {
  const { t } = useWorkoutLocale();
  const daysDelta = summary.thisWeekDays - summary.lastWeekDays;
  const volumeDelta = summary.thisWeekVolume - summary.lastWeekVolume;

  return (
    <div className="workout-weekly">
      <Statistic
        title={t("weekly.days")}
        value={summary.thisWeekDays}
        suffix={
          <>
            {` ${t("weekly.daysSuffix")}`}
            {daysDelta !== 0 ? (
              <span className="workout-weekly__delta">
                {formatSignedDelta(daysDelta, "", 0)}
              </span>
            ) : null}
          </>
        }
      />
      <Statistic title={t("weekly.volume")} value={summary.thisWeekVolume} suffix={t("common.kg")} />
      <Statistic
        title={t("weekly.vsLast")}
        value={volumeDelta === 0 ? "—" : formatSignedDelta(volumeDelta, "kg", 0)}
        valueStyle={{
          color:
            volumeDelta > 0
              ? linearTokens.semanticGreen
              : volumeDelta < 0
                ? linearTokens.inkMuted
                : undefined,
          fontSize: "1rem",
        }}
      />
    </div>
  );
}
