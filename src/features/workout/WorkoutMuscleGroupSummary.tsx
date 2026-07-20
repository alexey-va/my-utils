import type { MuscleGroupVolume } from "./workoutAnalytics";

type Props = {
  volumes: MuscleGroupVolume[];
};

export default function WorkoutMuscleGroupSummary({ volumes }: Props) {
  if (volumes.length === 0) {
    return null;
  }

  const max = Math.max(...volumes.map((v) => v.volume), 1);

  return (
    <div className="workout-muscle-groups" aria-label="Volume by muscle group this week">
      <h2 className="workout-muscle-groups__title">Muscle groups</h2>
      <div className="workout-muscle-groups__list">
        {volumes.map((item) => (
          <div key={item.group} className="workout-muscle-groups__row">
            <span className="workout-muscle-groups__label">{item.label}</span>
            <span className="workout-muscle-groups__bar-track">
              <span
                className="workout-muscle-groups__bar-fill"
                style={{ width: `${Math.round((item.volume / max) * 100)}%` }}
              />
            </span>
            <span className="workout-muscle-groups__value">
              {item.volume.toLocaleString()} kg
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
