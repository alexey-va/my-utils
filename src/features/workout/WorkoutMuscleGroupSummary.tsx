import type { MuscleGroupVolume } from "./workoutAnalytics";
import { localizedMuscleGroupLabel } from "./workoutMuscleGroups";
import { useWorkoutLocale } from "./workoutLocale";

type Props = {
  volumes: MuscleGroupVolume[];
};

export default function WorkoutMuscleGroupSummary({ volumes }: Props) {
  const { formatNumber, locale, t } = useWorkoutLocale();
  if (volumes.length === 0) {
    return null;
  }

  const max = Math.max(...volumes.map((v) => v.volume), 1);

  return (
    <div className="workout-muscle-groups" aria-label={t("muscles.aria")}>
      <h2 className="workout-muscle-groups__title">{t("muscles.title")}</h2>
      <div className="workout-muscle-groups__list">
        {volumes.map((item) => (
          <div key={item.group} className="workout-muscle-groups__row">
            <span className="workout-muscle-groups__label">
              {localizedMuscleGroupLabel(item.group, locale)}
            </span>
            <span className="workout-muscle-groups__bar-track">
              <span
                className="workout-muscle-groups__bar-fill"
                style={{ width: `${Math.round((item.volume / max) * 100)}%` }}
              />
            </span>
            <span className="workout-muscle-groups__value">
              {formatNumber(item.volume)} {t("common.kg")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
