/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ConfigProvider } from "antd";
import enUS from "antd/locale/en_US";
import ruRU from "antd/locale/ru_RU";

export type WorkoutLocale = "en" | "ru";

export const WORKOUT_LOCALE_STORAGE_KEY = "my-utils.workout-locale";

const en = {
  "page.title": "Workout log",
  "page.subtitle": "Progress, activity, and workout history in one focused view.",
  "page.progressAria": "Progress",
  "page.sessionsAria": "Exercise and sessions",
  "language.label": "Workout language",
  "common.all": "All",
  "common.date": "Date",
  "common.weight": "Weight",
  "common.kg": "kg",
  "common.steps": "Steps",
  "common.volume": "Volume",
  "common.latest": "Latest",
  "common.average": "Avg",
  "common.add": "Add",
  "common.update": "Update",
  "common.save": "Save",
  "common.reset": "Reset",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.loading": "Loading…",
  "common.expand": "Open detailed view",
  "common.close": "Close",
  "period.days": "{count} d",
  "period.weeks": "{count} wk",
  "steps.title": "Steps",
  "steps.hint": "Apple Health via Shortcut",
  "steps.today": "Today",
  "steps.unit": "steps",
  "steps.empty": "No steps yet — run the Shortcut on iPhone",
  "steps.detailsTitle": "Steps by day",
  "weight.title": "Body weight",
  "weight.hint": "Telegram bot or API",
  "weight.empty": "No weight yet — tell the bot «вес 82.5»",
  "weight.detailsTitle": "Weight by day",
  "weight.deltaPeriod": "Δ period",
  "health.detailsHint": "Detailed daily history for the selected period.",
  "health.tableValue": "Value",
  "weekly.days": "Workout days this week",
  "weekly.daysSuffix": "days",
  "weekly.volume": "Volume this week",
  "weekly.vsLast": "vs last week",
  "muscles.title": "Muscle groups",
  "muscles.aria": "Volume by muscle group this week",
  "muscle.chest": "Chest",
  "muscle.back": "Back",
  "muscle.legs": "Legs",
  "muscle.shoulders": "Shoulders",
  "muscle.arms": "Arms",
  "muscle.core": "Core",
  "muscle.other": "Other",
  "toolbar.selectExercise": "Select exercise",
  "toolbar.exerciseAria": "Exercise",
  "toolbar.logSession": "Log session",
  "toolbar.addExercise": "Add exercise",
  "toolbar.sessions": "Sessions",
  "toolbar.trainingGrid": "Training grid",
  "toolbar.editExercise": "Edit exercise",
  "toolbar.exportCsv": "Export CSV",
  "toolbar.shortcuts": "log · search",
  "progress.title": "Progress",
  "progress.hint": "Choose a metric and time range to compare each session.",
  "progress.selectExercise": "Select an exercise below to see progress",
  "progress.deleteExercise": "Delete this exercise?",
  "progress.deleteExerciseDescription": "All logged sessions for it will be removed.",
  "progress.sessions": "Sessions",
  "progress.bestWeight": "Best weight",
  "progress.vsPrevious": "vs prev",
  "progress.weeksAgo": "vs {count} wk ago",
  "progress.bestE1rm": "Best e1RM",
  "progress.bestVolume": "Best volume",
  "progress.maxReps": "Max reps",
  "progress.noSessions": "No sessions in this period — log one below",
  "grid.title": "Training grid",
  "grid.empty": "No workout data yet",
  "grid.exercise": "Exercise",
  "grid.volumeLegend": "Volume intensity legend",
  "grid.lowHigh": "low → high",
  "grid.instructions": "· oldest ← left · newest → right · drag to move · click to edit",
  "grid.dragEdit": "drag to move · click to edit",
  "grid.addSession": "Add session",
  "grid.editSession": "Edit session",
  "grid.clickToAdd": "Click to add session",
  "grid.kgVolume": "{value} kg volume",
  "sessions.title": "Sessions",
  "sessions.selectExercise": "Select an exercise above",
  "sessions.setsReps": "Sets × reps",
  "sessions.max": "Max",
  "sessions.deltaWeight": "Δ weight",
  "sessions.deltaVolume": "Δ vol",
  "sessions.empty": "No sessions — use Log session to add one",
  "sessions.deleteTitle": "Delete this session?",
  "sessions.deleteDescription": "Remove session on {date}?",
  "entry.editHint": "edit session",
  "entry.newHint": "new session",
  "entry.pickDate": "Pick a date",
  "entry.weightKg": "Weight (kg)",
  "entry.enterWeight": "Enter weight",
  "entry.repsPerSet": "Reps per set",
  "entry.repsHelp": "Uniform: 10 · Classic: 10/10/10/12 · Variable: 10/10/9/9",
  "entry.enterReps": "Enter reps",
  "entry.invalidReps": "Invalid reps pattern",
  "entry.sameAsLast": "Same as last",
  "entry.deleteSession": "Delete session",
  "entry.deleteDescription": "Remove {exercise} on {date} from the log.",
  "exercise.editHint": "Rename or re-tag this exercise.",
  "exercise.addHint": "Add a new exercise type to the log.",
  "exercise.name": "Exercise name",
  "exercise.enterName": "Enter a name",
  "exercise.example": "e.g. Bench press",
  "exercise.muscleGroup": "Muscle group",
  "modal.editSession": "Edit session",
  "modal.logSession": "Log session",
  "modal.editExercise": "Edit exercise",
  "modal.addExercise": "Add exercise",
  "error.invalidValue": "Invalid value",
  "message.loadWorkoutFailed": "Failed to load workout data",
  "message.exerciseAdded": "Added “{name}”",
  "message.exerciseUpdated": "Exercise updated",
  "message.exerciseRemoved": "Exercise removed",
  "message.updateExerciseFailed": "Failed to update exercise",
  "message.saveFailed": "Failed to save",
  "message.deleteSessionFailed": "Failed to delete session",
  "message.sourceMissing": "Source session not found",
  "message.targetOccupied": "Target cell already has a session — pick an empty cell",
  "message.moveFailed": "Failed to move session",
  "message.progressFailed": "Failed to load progress",
  "tooltip.last": "last",
} as const;

type TranslationKey = keyof typeof en;
type TranslationParams = Record<string, string | number>;

const ru: Record<TranslationKey, string> = {
  "page.title": "Тренировки",
  "page.subtitle": "Прогресс, активность и история тренировок в одном месте.",
  "page.progressAria": "Прогресс",
  "page.sessionsAria": "Упражнения и подходы",
  "language.label": "Язык раздела тренировок",
  "common.all": "Всё",
  "common.date": "Дата",
  "common.weight": "Вес",
  "common.kg": "кг",
  "common.steps": "Шаги",
  "common.volume": "Объём",
  "common.latest": "Последний",
  "common.average": "Среднее",
  "common.add": "Добавить",
  "common.update": "Обновить",
  "common.save": "Сохранить",
  "common.reset": "Сбросить",
  "common.delete": "Удалить",
  "common.edit": "Изменить",
  "common.loading": "Загрузка…",
  "common.expand": "Открыть подробный вид",
  "common.close": "Закрыть",
  "period.days": "{count} дн.",
  "period.weeks": "{count} нед.",
  "steps.title": "Шаги",
  "steps.hint": "Apple Health через Shortcut",
  "steps.today": "Сегодня",
  "steps.unit": "шагов",
  "steps.empty": "Шагов пока нет — запусти Shortcut на iPhone",
  "steps.detailsTitle": "Шаги по дням",
  "weight.title": "Вес тела",
  "weight.hint": "Telegram-бот или API",
  "weight.empty": "Веса пока нет — напиши боту «вес 82.5»",
  "weight.detailsTitle": "Вес по дням",
  "weight.deltaPeriod": "Δ за период",
  "health.detailsHint": "Подробная история по дням за выбранный период.",
  "health.tableValue": "Значение",
  "weekly.days": "Дней с тренировками на этой неделе",
  "weekly.daysSuffix": "дн.",
  "weekly.volume": "Объём за неделю",
  "weekly.vsLast": "к прошлой неделе",
  "muscles.title": "Группы мышц",
  "muscles.aria": "Объём по группам мышц за эту неделю",
  "muscle.chest": "Грудь",
  "muscle.back": "Спина",
  "muscle.legs": "Ноги",
  "muscle.shoulders": "Плечи",
  "muscle.arms": "Руки",
  "muscle.core": "Кор",
  "muscle.other": "Другое",
  "toolbar.selectExercise": "Выбери упражнение",
  "toolbar.exerciseAria": "Упражнение",
  "toolbar.logSession": "Записать тренировку",
  "toolbar.addExercise": "Добавить упражнение",
  "toolbar.sessions": "Подходы",
  "toolbar.trainingGrid": "Сетка тренировок",
  "toolbar.editExercise": "Изменить упражнение",
  "toolbar.exportCsv": "Экспорт CSV",
  "toolbar.shortcuts": "запись · поиск",
  "progress.title": "Прогресс",
  "progress.hint": "Выбери показатель и период для сравнения тренировок.",
  "progress.selectExercise": "Выбери упражнение ниже, чтобы увидеть прогресс",
  "progress.deleteExercise": "Удалить упражнение?",
  "progress.deleteExerciseDescription": "Все записанные тренировки для него будут удалены.",
  "progress.sessions": "Тренировок",
  "progress.bestWeight": "Лучший вес",
  "progress.vsPrevious": "к прошлой",
  "progress.weeksAgo": "к {count} нед. назад",
  "progress.bestE1rm": "Лучший e1RM",
  "progress.bestVolume": "Лучший объём",
  "progress.maxReps": "Макс. повторов",
  "progress.noSessions": "За этот период тренировок нет — добавь одну ниже",
  "grid.title": "Сетка тренировок",
  "grid.empty": "Данных о тренировках пока нет",
  "grid.exercise": "Упражнение",
  "grid.volumeLegend": "Интенсивность объёма",
  "grid.lowHigh": "мало → много",
  "grid.instructions": "· старые ← слева · новые → справа · перетащи или нажми для правки",
  "grid.dragEdit": "перетащи или нажми для правки",
  "grid.addSession": "Добавить тренировку",
  "grid.editSession": "Изменить тренировку",
  "grid.clickToAdd": "Нажми, чтобы добавить тренировку",
  "grid.kgVolume": "{value} кг объёма",
  "sessions.title": "Тренировки",
  "sessions.selectExercise": "Выбери упражнение выше",
  "sessions.setsReps": "Подходы × повторы",
  "sessions.max": "Макс.",
  "sessions.deltaWeight": "Δ веса",
  "sessions.deltaVolume": "Δ объёма",
  "sessions.empty": "Тренировок нет — добавь первую",
  "sessions.deleteTitle": "Удалить тренировку?",
  "sessions.deleteDescription": "Удалить тренировку за {date}?",
  "entry.editHint": "изменение тренировки",
  "entry.newHint": "новая тренировка",
  "entry.pickDate": "Выбери дату",
  "entry.weightKg": "Вес (кг)",
  "entry.enterWeight": "Укажи вес",
  "entry.repsPerSet": "Повторы по подходам",
  "entry.repsHelp": "Одинаково: 10 · Классика: 10/10/10/12 · По-разному: 10/10/9/9",
  "entry.enterReps": "Укажи повторы",
  "entry.invalidReps": "Некорректная схема повторов",
  "entry.sameAsLast": "Как в прошлый раз",
  "entry.deleteSession": "Удалить тренировку",
  "entry.deleteDescription": "Удалить {exercise} за {date} из журнала.",
  "exercise.editHint": "Измени название или группу мышц.",
  "exercise.addHint": "Добавь новый тип упражнения в журнал.",
  "exercise.name": "Название упражнения",
  "exercise.enterName": "Введи название",
  "exercise.example": "например, Жим лёжа",
  "exercise.muscleGroup": "Группа мышц",
  "modal.editSession": "Изменить тренировку",
  "modal.logSession": "Записать тренировку",
  "modal.editExercise": "Изменить упражнение",
  "modal.addExercise": "Добавить упражнение",
  "error.invalidValue": "Некорректное значение",
  "message.loadWorkoutFailed": "Не удалось загрузить данные тренировок",
  "message.exerciseAdded": "Добавлено упражнение «{name}»",
  "message.exerciseUpdated": "Упражнение обновлено",
  "message.exerciseRemoved": "Упражнение удалено",
  "message.updateExerciseFailed": "Не удалось обновить упражнение",
  "message.saveFailed": "Не удалось сохранить",
  "message.deleteSessionFailed": "Не удалось удалить тренировку",
  "message.sourceMissing": "Исходная тренировка не найдена",
  "message.targetOccupied": "В целевой ячейке уже есть тренировка — выбери пустую",
  "message.moveFailed": "Не удалось перенести тренировку",
  "message.progressFailed": "Не удалось загрузить прогресс",
  "tooltip.last": "последнее",
};

type WorkoutLocaleContextValue = {
  locale: WorkoutLocale;
  localeTag: "en-US" | "ru-RU";
  setLocale: (locale: WorkoutLocale) => void;
  t: (key: TranslationKey, params?: TranslationParams) => string;
  formatDate: (isoDate: string, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number) => string;
};

const WorkoutLocaleContext = createContext<WorkoutLocaleContextValue | null>(null);

function initialLocale(): WorkoutLocale {
  const stored = window.localStorage.getItem(WORKOUT_LOCALE_STORAGE_KEY);
  if (stored === "en" || stored === "ru") {
    return stored;
  }
  return window.navigator.language.toLowerCase().startsWith("ru") ? "ru" : "en";
}

export function WorkoutLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<WorkoutLocale>(initialLocale);
  const localeTag = locale === "ru" ? "ru-RU" : "en-US";

  const value = useMemo<WorkoutLocaleContextValue>(() => {
    const dictionary = locale === "ru" ? ru : en;

    return {
      locale,
      localeTag,
      setLocale(nextLocale) {
        window.localStorage.setItem(WORKOUT_LOCALE_STORAGE_KEY, nextLocale);
        setLocaleState(nextLocale);
      },
      t(key, params) {
        let text: string = dictionary[key];
        for (const [name, replacement] of Object.entries(params ?? {})) {
          text = text.replaceAll(`{${name}}`, String(replacement));
        }
        return text;
      },
      formatDate(isoDate, options) {
        const date = new Date(`${isoDate}T12:00:00`);
        return new Intl.DateTimeFormat(
          localeTag,
          options ?? { day: "numeric", month: "short", year: "numeric" },
        ).format(date);
      },
      formatNumber(value) {
        return new Intl.NumberFormat(localeTag).format(value);
      },
    };
  }, [locale, localeTag]);

  return (
    <WorkoutLocaleContext.Provider value={value}>
      <ConfigProvider locale={locale === "ru" ? ruRU : enUS}>
        {children}
      </ConfigProvider>
    </WorkoutLocaleContext.Provider>
  );
}

export function useWorkoutLocale(): WorkoutLocaleContextValue {
  const value = useContext(WorkoutLocaleContext);
  if (!value) {
    throw new Error("useWorkoutLocale must be used inside WorkoutLocaleProvider");
  }
  return value;
}
