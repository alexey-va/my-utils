import { Statistic } from "antd";
import type { WeeklySummary } from "./workoutAnalytics";
import { formatSignedDelta } from "./workoutAnalytics";

type Props = {
  summary: WeeklySummary;
};

export default function WorkoutWeeklySummary({ summary }: Props) {
  const sessionDelta = summary.thisWeekSessions - summary.lastWeekSessions;
  const volumeDelta = summary.thisWeekVolume - summary.lastWeekVolume;

  return (
    <div className="workout-weekly">
      <Statistic
        title="Sessions this week"
        value={summary.thisWeekSessions}
        suffix={
          sessionDelta !== 0 ? (
            <span className="workout-weekly__delta">
              {formatSignedDelta(sessionDelta, "", 0)}
            </span>
          ) : undefined
        }
      />
      <Statistic title="Volume this week" value={summary.thisWeekVolume} suffix="kg" />
      <Statistic
        title="vs last week"
        value={volumeDelta === 0 ? "—" : formatSignedDelta(volumeDelta, "kg", 0)}
        valueStyle={{
          color: volumeDelta > 0 ? "#52c41a" : volumeDelta < 0 ? "#8b93a1" : undefined,
          fontSize: "1rem",
        }}
      />
    </div>
  );
}
