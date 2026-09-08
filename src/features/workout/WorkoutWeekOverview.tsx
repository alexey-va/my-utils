import { CheckOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { WorkoutGrid } from "../../api/types";
import { useWorkoutLocale } from "./workoutLocale";

export default function WorkoutWeekOverview({
  grid,
  loading,
}: {
  grid: WorkoutGrid;
  loading: boolean;
}) {
  const { t, formatDate } = useWorkoutLocale();
  const today = dayjs();
  const monday = today.startOf("day").subtract((today.day() + 6) % 7, "day");
  const days = Array.from({ length: 7 }, (_, i) => monday.add(i, "day"));
  const activeDates = new Set(
    grid.rows.flatMap((row) =>
      Object.entries(row.cells)
        .filter(([, cell]) => cell != null)
        .map(([date]) => date),
    ),
  );
  return (
    <section className="workout-week-card" aria-label={t("overview.week")}>
      <div>
        <h2>{t("overview.week")}</h2>
      </div>
      <div className="workout-week-card__body">
        <div className="workout-week-card__range">
          <span>
            {formatDate(days[0].format("YYYY-MM-DD"), {
              day: "numeric",
              month: "short",
            })}{" "}
            —{" "}
            {formatDate(days[6].format("YYYY-MM-DD"), {
              day: "numeric",
              month: "short",
            })}
          </span>
        </div>
        <div className="workout-week-card__calendar">
          {days.map((day) => {
            const date = day.format("YYYY-MM-DD");
            const active = !loading && activeDates.has(date);
            const isToday = day.isSame(today, "day");
            return (
              <div
                key={date}
                className={`workout-day${active ? " workout-day--active" : ""}${isToday ? " workout-day--today" : ""}${day.isAfter(today, "day") ? " workout-day--future" : ""}`}
                aria-current={isToday ? "date" : undefined}
                aria-label={`${formatDate(date, { weekday: "long", day: "numeric" })}: ${loading ? t("common.loading") : active ? t("overview.logged") : t("overview.noSession")}`}
              >
                <span>{formatDate(date, { weekday: "short" })}</span>
                <strong>{day.date()}</strong>
                <span className="workout-day__mark" aria-hidden>
                  {active ? <CheckOutlined /> : "·"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
