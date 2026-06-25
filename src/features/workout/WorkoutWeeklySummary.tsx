import { Statistic } from "antd";
import { linearTokens } from "../../design/linearTokens";
import type { WeeklySummary } from "./workoutAnalytics";
import { formatSignedDelta } from "./workoutAnalytics";

type Props = {
  summary: WeeklySummary;
};

export default function WorkoutWeeklySummary({ summary }: Props) {
  const daysDelta = summary.thisWeekDays - summary.lastWeekDays;
  const volumeDelta = summary.thisWeekVolume - summary.lastWeekVolume;

  return (
    <div className="workout-weekly">
      <Statistic
        title="Workout days this week"
        value={summary.thisWeekDays}
        suffix={
          <>
            {" days"}
            {daysDelta !== 0 ? (
              <span className="workout-weekly__delta">
                {formatSignedDelta(daysDelta, "", 0)}
              </span>
            ) : null}
          </>
        }
      />
      <Statistic title="Volume this week" value={summary.thisWeekVolume} suffix="kg" />
      <Statistic
        title="vs last week"
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
