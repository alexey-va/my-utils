import { Segmented } from "antd";
import { useWorkoutLocale, type WorkoutLocale } from "./workoutLocale";

export default function WorkoutLanguageSwitch() {
  const { locale, setLocale, t } = useWorkoutLocale();

  return (
    <Segmented
      className="workout-language-switch"
      aria-label={t("language.label")}
      value={locale}
      options={[
        { label: "RU", value: "ru" },
        { label: "EN", value: "en" },
      ]}
      onChange={(value) => setLocale(String(value) as WorkoutLocale)}
    />
  );
}
