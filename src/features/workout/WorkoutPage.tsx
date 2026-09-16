import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button, Modal, Select, Spin } from "antd";
import type { RefSelectProps } from "antd/es/select";
import { useLocation, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import PageLayout from "../../shared/components/PageLayout";
import {
  AppstoreOutlined,
  CalendarOutlined,
  ReloadOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import WorkoutWeekOverview from "./WorkoutWeekOverview";
import type { Exercise, ProgressMetric, ProgressPoint } from "../../api/types";
import type { ProgressPeriod } from "./workoutAnalytics";
import {
  computeMuscleGroupVolumeThisWeek,
  computeWeeklySummary,
  filterPointsByPeriod,
  lastSessionForRow,
} from "./workoutAnalytics";
import WorkoutMuscleGroupSummary from "./WorkoutMuscleGroupSummary";
import { normalizeMuscleGroup } from "./workoutMuscleGroups";
import { useWorkoutShortcuts } from "./useWorkoutShortcuts";
import WorkoutWeeklySummary from "./WorkoutWeeklySummary";
import { exportWorkoutGridCsv } from "./exportWorkoutGridCsv";
import WorkoutEntryForm from "./WorkoutEntryForm";
import WorkoutExerciseForm from "./WorkoutExerciseForm";
import WorkoutExerciseBar from "./WorkoutExerciseBar";
import type { StepsPeriod } from "./WorkoutStepsChart";
import type { WeightPeriod } from "./WorkoutBodyWeightChart";
import { useStepsHistory } from "./useStepsHistory";
import { useBodyWeightHistory } from "./useBodyWeightHistory";
import {
  exerciseDraftFromExercise,
  exerciseDraftNew,
  entryDraftFromPoint,
  type ExerciseDraft,
  type WorkoutEntryDraft,
} from "./types";
import { useCompareProgress } from "./useCompareProgress";
import { useWorkoutGrid } from "./useWorkoutGrid";
import { sendWorkoutPageViewOnce } from "../../telemetry/workoutTelemetry";
import WorkoutLanguageSwitch from "./WorkoutLanguageSwitch";
import { WorkoutLocaleProvider, useWorkoutLocale } from "./workoutLocale";
import {
  PATH_HOME,
  PATH_WORKOUT_JOURNAL,
  PATH_WORKOUT_OVERVIEW,
} from "../../config/paths";

const WorkoutSessionList = lazy(() => import("./WorkoutSessionList"));
const WorkoutGridTable = lazy(() => import("./WorkoutGridTable"));
const WorkoutProgressPanel = lazy(() => import("./WorkoutProgressPanel"));
const WorkoutStepsChart = lazy(() => import("./WorkoutStepsChart"));
const WorkoutBodyWeightChart = lazy(() => import("./WorkoutBodyWeightChart"));

function InsightLoading({ wide = false }: { wide?: boolean }) {
  return (
    <div
      className={`workout-insight-loading${wide ? " workout-insight-loading--wide" : ""}`}
    >
      <Spin />
    </div>
  );
}

function newSessionDraft(
  exerciseId: string,
  exerciseName: string,
): WorkoutEntryDraft {
  const today = dayjs().format("YYYY-MM-DD");
  return {
    key: `new-${today}-${exerciseId}`,
    exerciseId,
    exerciseName,
    performedOn: today,
    weightKg: 20,
    setCount: 3,
    repsPerSet: 10,
    maxReps: 10,
    repsPattern: "10",
  };
}

function WorkoutPageContent() {
  const { t, formatDate } = useWorkoutLocale();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    sendWorkoutPageViewOnce();
  }, []);

  const {
    exercises,
    grid,
    loading,
    saving,
    error,
    reload,
    dataVersion,
    selectedExerciseId,
    selectExercise,
    addExercise,
    updateExercise,
    deleteExercise,
    saveEntry,
    deleteEntry,
    moveEntry,
  } = useWorkoutGrid();

  const [metric, setMetric] = useState<ProgressMetric>("volume");
  const [period, setPeriod] = useState<ProgressPeriod>("p12");
  const [entryModal, setEntryModal] = useState<{
    draft: WorkoutEntryDraft;
    isEdit: boolean;
  } | null>(null);
  const [exerciseModal, setExerciseModal] = useState<ExerciseDraft | null>(
    null,
  );
  const [showAllExercises, setShowAllExercises] = useState(true);
  const view = location.pathname === PATH_WORKOUT_JOURNAL ? "journal" : "overview";
  const [stepsPeriod, setStepsPeriod] = useState<StepsPeriod>("p31");
  const [weightPeriod, setWeightPeriod] = useState<WeightPeriod>("p31");
  const exerciseSelectRef = useRef<RefSelectProps>(null);

  const selectView = useCallback(
    (nextView: "overview" | "journal") => {
      if (nextView === "overview" && location.pathname === PATH_HOME) {
        return;
      }
      navigate(nextView === "journal" ? PATH_WORKOUT_JOURNAL : PATH_WORKOUT_OVERVIEW);
    },
    [location.pathname, navigate],
  );

  const {
    history: stepsHistory,
    loading: stepsLoading,
    error: stepsError,
    retry: retrySteps,
  } = useStepsHistory();
  const {
    history: weightHistory,
    loading: weightLoading,
    error: weightError,
    retry: retryWeight,
  } = useBodyWeightHistory();

  const chartExerciseIds = useMemo(
    () => (selectedExerciseId ? [selectedExerciseId] : []),
    [selectedExerciseId],
  );

  const {
    series,
    primary,
    loading: progressLoading,
  } = useCompareProgress(chartExerciseIds, selectedExerciseId, dataVersion);

  const weeklySummary = useMemo(() => computeWeeklySummary(grid), [grid]);
  const muscleGroupVolumes = useMemo(
    () => computeMuscleGroupVolumeThisWeek(grid, exercises),
    [grid, exercises],
  );

  const selectedExercise = exercises.find((e) => e.id === selectedExerciseId);
  const selectedRow = grid.rows.find(
    (r) => r.exerciseId === selectedExerciseId,
  );

  const sessionHistoryPoints = useMemo(
    () => filterPointsByPeriod(primary?.points ?? [], period),
    [primary?.points, period],
  );

  const entryLastSession = useMemo(() => {
    if (!entryModal || entryModal.isEdit) {
      return undefined;
    }
    return selectedRow ? lastSessionForRow(selectedRow, grid.dates) : undefined;
  }, [entryModal, grid.dates, selectedRow]);

  const openLogSession = useCallback(() => {
    if (!selectedExerciseId || !selectedExercise) {
      return;
    }
    const last = selectedRow
      ? lastSessionForRow(selectedRow, grid.dates)
      : undefined;
    const today = dayjs().format("YYYY-MM-DD");
    setEntryModal({
      isEdit: false,
      draft: {
        ...newSessionDraft(selectedExerciseId, selectedExercise.name),
        ...(last
          ? {
              weightKg: last.weightKg,
              setCount: last.setCount,
              repsPerSet: last.repsPerSet,
              maxReps: last.maxReps,
            }
          : {}),
        performedOn: today,
      },
    });
  }, [grid.dates, selectedExercise, selectedExerciseId, selectedRow]);

  const openEditSession = useCallback(
    (point: ProgressPoint) => {
      if (!selectedExerciseId || !selectedExercise) {
        return;
      }
      setEntryModal({
        isEdit: true,
        draft: entryDraftFromPoint(
          selectedExerciseId,
          selectedExercise.name,
          point,
        ),
      });
    },
    [selectedExercise, selectedExerciseId],
  );

  const closeEntryModal = useCallback(() => setEntryModal(null), []);
  const closeExerciseModal = useCallback(() => setExerciseModal(null), []);

  useWorkoutShortcuts({
    enabled: !saving,
    onLogSession: () => {
      if (entryModal) {
        closeEntryModal();
      } else if (exerciseModal) {
        closeExerciseModal();
      } else {
        openLogSession();
      }
    },
    onCloseForm: () => {
      if (entryModal) {
        closeEntryModal();
      }
      if (exerciseModal) {
        closeExerciseModal();
      }
    },
    onFocusSearch: () => exerciseSelectRef.current?.focus(),
  });

  const openEditExercise = useCallback((exercise: Exercise) => {
    setExerciseModal(
      exerciseDraftFromExercise(
        exercise.id,
        exercise.name,
        normalizeMuscleGroup(exercise.muscleGroup),
      ),
    );
  }, []);

  return (
    <PageLayout
      title={t("page.title")}
      actions={
        <div className="workout-heading-actions">
          <span className="workout-date">
            {formatDate(dayjs().format("YYYY-MM-DD"), {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
          <WorkoutLanguageSwitch />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={loading || saving || Boolean(error)}
            onClick={() =>
              selectedExerciseId
                ? openLogSession()
                : setExerciseModal(exerciseDraftNew())
            }
          >
            {selectedExerciseId
              ? t("toolbar.logSession")
              : t("toolbar.addExercise")}
          </Button>
        </div>
      }
    >
      <div className="workout-dashboard">
        {error ? (
          <div className="workout-error" role="alert">
            <div>
              <strong>{t("overview.loadError")}</strong>
              <p>{error}</p>
            </div>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => void reload()}
              loading={loading}
            >
              {t("overview.retry")}
            </Button>
          </div>
        ) : null}
        <div className="workout-view-nav">
          <div
            className="workout-view-nav__tabs"
            role="group"
            aria-label={t("page.title")}
          >
            <button
              className="workout-view-tab"
              aria-pressed={view === "overview"}
              onClick={() => selectView("overview")}
            >
              <AppstoreOutlined />
              {t("overview.tab")}
            </button>
            <button
              className="workout-view-tab"
              aria-pressed={view === "journal"}
              onClick={() => selectView("journal")}
            >
              <CalendarOutlined />
              {t("overview.journal")}
            </button>
          </div>
          <span className="workout-view-nav__count">
            {t("overview.exercises", { count: exercises.length })}
          </span>
        </div>
        {view === "overview" ? (
          <>
            {stepsError || weightError ? (
              <div className="workout-error" role="alert">
                <strong>{t("overview.healthError")}</strong>
                <Button
                  onClick={() => {
                    if (stepsError) retrySteps();
                    if (weightError) retryWeight();
                  }}
                >
                  {t("overview.retry")}
                </Button>
              </div>
            ) : null}
            <WorkoutWeeklySummary
              summary={weeklySummary}
              loading={loading || Boolean(error)}
            />
            <section
              className="workout-overview-grid"
              aria-label={t("page.progressAria")}
            >
              <div className="workout-performance">
                <Suspense fallback={<InsightLoading wide />}>
                  <WorkoutProgressPanel
                    series={series}
                    primary={primary}
                    loading={loading || progressLoading}
                    metric={metric}
                    period={period}
                    onMetricChange={setMetric}
                    onPeriodChange={setPeriod}
                    exerciseControl={
                      <Select
                        ref={exerciseSelectRef}
                        id="overview-exercise"
                        aria-label={t("toolbar.exerciseAria")}
                        showSearch
                        optionFilterProp="label"
                        value={selectedExerciseId}
                        onChange={selectExercise}
                        options={exercises.map((exercise) => ({
                          value: exercise.id,
                          label: exercise.name,
                        }))}
                        loading={loading}
                        placeholder={t("toolbar.selectExercise")}
                      />
                    }
                    onDelete={() => {
                      if (selectedExerciseId)
                        void deleteExercise(selectedExerciseId).catch(() => {});
                    }}
                  />
                </Suspense>
              </div>
              <aside className="workout-context">
                <WorkoutWeekOverview
                  grid={grid}
                  loading={loading || Boolean(error)}
                />
                <WorkoutMuscleGroupSummary volumes={muscleGroupVolumes} />
              </aside>
            </section>
            <section
              className="workout-health-grid"
              aria-label={t("overview.health")}
            >
              <Suspense fallback={<InsightLoading />}>
                <WorkoutStepsChart
                  days={stepsHistory?.days ?? []}
                  todaySteps={stepsHistory?.todaySteps ?? null}
                  loading={stepsLoading}
                  period={stepsPeriod}
                  onPeriodChange={setStepsPeriod}
                />
              </Suspense>
              <Suspense fallback={<InsightLoading />}>
                <WorkoutBodyWeightChart
                  days={weightHistory?.days ?? []}
                  latestWeightKg={weightHistory?.latestWeightKg ?? null}
                  latestDate={weightHistory?.latestDate ?? null}
                  loading={weightLoading}
                  period={weightPeriod}
                  onPeriodChange={setWeightPeriod}
                />
              </Suspense>
            </section>
          </>
        ) : (
          <section
            className="workout-shell__log"
            aria-label={t("page.sessionsAria")}
          >
            <WorkoutExerciseBar
              exercises={exercises}
              selectedExerciseId={selectedExerciseId}
              loading={loading}
              selectRef={exerciseSelectRef}
              onSelect={selectExercise}
              onLogSession={openLogSession}
              onAddExercise={() => setExerciseModal(exerciseDraftNew())}
              onEditExercise={() => {
                if (!selectedExerciseId || !selectedExercise) {
                  return;
                }
                openEditExercise(selectedExercise);
              }}
              onExportCsv={() => exportWorkoutGridCsv(grid, t("grid.exercise"))}
              canExport={grid.rows.length > 0}
              showAllExercises={showAllExercises}
              onToggleAllExercises={() => setShowAllExercises((open) => !open)}
            />

            {showAllExercises ? (
              <p className="workout-journal-hint">{t("overview.gridHint")}</p>
            ) : null}
            {showAllExercises ? (
              <Suspense fallback={<InsightLoading wide />}>
                <WorkoutGridTable
                  exercises={exercises}
                  grid={grid}
                  selectedExerciseId={selectedExerciseId}
                  loading={loading || saving}
                  onSelectExercise={selectExercise}
                  onMoveCell={moveEntry}
                  onUpdateCell={saveEntry}
                  onDeleteCell={deleteEntry}
                />
              </Suspense>
            ) : (
              <Suspense fallback={<InsightLoading wide />}>
                <WorkoutSessionList
                  points={sessionHistoryPoints}
                  exerciseName={
                    primary?.exercise.name ?? selectedExercise?.name
                  }
                  loading={progressLoading || saving}
                  onEdit={openEditSession}
                  onDelete={async (point) => {
                    if (!selectedExerciseId) {
                      return;
                    }
                    await deleteEntry(selectedExerciseId, point.date);
                  }}
                />
              </Suspense>
            )}
          </section>
        )}
      </div>

      <Modal
        title={
          entryModal?.isEdit ? t("modal.editSession") : t("modal.logSession")
        }
        open={entryModal != null}
        onCancel={() => {
          if (!saving) closeEntryModal();
        }}
        closable={!saving}
        keyboard={!saving}
        maskClosable={!saving}
        footer={null}
        destroyOnHidden
        width={520}
      >
        {entryModal ? (
          <WorkoutEntryForm
            key={entryModal.draft.key}
            saving={saving}
            draft={entryModal.draft}
            isEdit={entryModal.isEdit}
            lastSession={entryLastSession}
            onSubmit={async (values) => {
              await saveEntry(values);
              closeEntryModal();
            }}
            onDelete={
              entryModal.isEdit
                ? async () => {
                    await deleteEntry(
                      entryModal.draft.exerciseId,
                      entryModal.draft.performedOn,
                    );
                    closeEntryModal();
                  }
                : undefined
            }
          />
        ) : null}
      </Modal>

      <Modal
        title={
          exerciseModal?.exerciseId
            ? t("modal.editExercise")
            : t("modal.addExercise")
        }
        open={exerciseModal != null}
        onCancel={() => {
          if (!saving) closeExerciseModal();
        }}
        closable={!saving}
        keyboard={!saving}
        maskClosable={!saving}
        footer={null}
        destroyOnHidden
        width={480}
      >
        {exerciseModal ? (
          <WorkoutExerciseForm
            key={exerciseModal.key}
            draft={exerciseModal}
            saving={saving}
            isEdit={Boolean(exerciseModal.exerciseId)}
            onSubmit={async (name, muscleGroup) => {
              if (exerciseModal.exerciseId) {
                await updateExercise(
                  exerciseModal.exerciseId,
                  name,
                  muscleGroup,
                );
              } else {
                await addExercise(name, muscleGroup);
              }
              closeExerciseModal();
            }}
            onDelete={
              exerciseModal.exerciseId
                ? async () => {
                    await deleteExercise(exerciseModal.exerciseId!);
                    closeExerciseModal();
                  }
                : undefined
            }
          />
        ) : null}
      </Modal>
    </PageLayout>
  );
}

export default function WorkoutPage() {
  return (
    <WorkoutLocaleProvider>
      <WorkoutPageContent />
    </WorkoutLocaleProvider>
  );
}
