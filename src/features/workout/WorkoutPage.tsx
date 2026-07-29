import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal, Spin } from "antd";
import type { RefSelectProps } from "antd/es/select";
import dayjs from "dayjs";
import PageLayout from "../../shared/components/PageLayout";
import AppPanel from "../../shared/components/AppPanel";
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

const WorkoutSessionList = lazy(() => import("./WorkoutSessionList"));
const WorkoutGridTable = lazy(() => import("./WorkoutGridTable"));
const WorkoutProgressPanel = lazy(() => import("./WorkoutProgressPanel"));
const WorkoutStepsChart = lazy(() => import("./WorkoutStepsChart"));
const WorkoutBodyWeightChart = lazy(() => import("./WorkoutBodyWeightChart"));

function InsightLoading({ wide = false }: { wide?: boolean }) {
  return (
    <div className={`workout-insight-loading${wide ? " workout-insight-loading--wide" : ""}`}>
      <Spin />
    </div>
  );
}

function newSessionDraft(exerciseId: string, exerciseName: string): WorkoutEntryDraft {
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

export default function WorkoutPage() {
  useEffect(() => {
    sendWorkoutPageViewOnce();
  }, []);

  const {
    exercises,
    grid,
    loading,
    saving,
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
  const [exerciseModal, setExerciseModal] = useState<ExerciseDraft | null>(null);
  const [showAllExercises, setShowAllExercises] = useState(true);
  const [progressRefreshKey, setProgressRefreshKey] = useState(0);
  const [stepsPeriod, setStepsPeriod] = useState<StepsPeriod>("p31");
  const [weightPeriod, setWeightPeriod] = useState<WeightPeriod>("p31");
  const exerciseSelectRef = useRef<RefSelectProps>(null);

  const { history: stepsHistory, loading: stepsLoading } = useStepsHistory();
  const { history: weightHistory, loading: weightLoading } = useBodyWeightHistory();

  const chartExerciseIds = useMemo(
    () => (selectedExerciseId ? [selectedExerciseId] : []),
    [selectedExerciseId],
  );

  const { series, primary, loading: progressLoading } = useCompareProgress(
    chartExerciseIds,
    selectedExerciseId,
    progressRefreshKey,
  );

  const weeklySummary = useMemo(() => computeWeeklySummary(grid), [grid]);
  const muscleGroupVolumes = useMemo(
    () => computeMuscleGroupVolumeThisWeek(grid, exercises),
    [grid, exercises],
  );

  const selectedExercise = exercises.find((e) => e.id === selectedExerciseId);
  const selectedRow = grid.rows.find((r) => r.exerciseId === selectedExerciseId);

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
    const last = selectedRow ? lastSessionForRow(selectedRow, grid.dates) : undefined;
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
        draft: entryDraftFromPoint(selectedExerciseId, selectedExercise.name, point),
      });
    },
    [selectedExercise, selectedExerciseId],
  );

  const closeEntryModal = useCallback(() => setEntryModal(null), []);
  const closeExerciseModal = useCallback(() => setExerciseModal(null), []);

  useWorkoutShortcuts({
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
      title="Workout log"
      subtitle="Progress, activity, and workout history in one focused view."
    >
      <AppPanel className="workout-panel">
        <div className="workout-shell workout-shell--simple">
          <section className="workout-shell__insights" aria-label="Progress">
            <WorkoutWeeklySummary summary={weeklySummary} />
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
            <WorkoutMuscleGroupSummary volumes={muscleGroupVolumes} />
            <Suspense fallback={<InsightLoading wide />}>
              <WorkoutProgressPanel
                series={series}
                primary={primary}
                loading={progressLoading}
                metric={metric}
                period={period}
                onMetricChange={setMetric}
                onPeriodChange={setPeriod}
                onDelete={() => {
                  if (selectedExerciseId) {
                    void deleteExercise(selectedExerciseId);
                  }
                }}
              />
            </Suspense>
          </section>

          <section className="workout-shell__log" aria-label="Exercise and sessions">
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
              onExportCsv={() => exportWorkoutGridCsv(grid)}
              canExport={grid.rows.length > 0}
              showAllExercises={showAllExercises}
              onToggleAllExercises={() => setShowAllExercises((open) => !open)}
            />

            {showAllExercises ? (
              <Suspense fallback={<InsightLoading wide />}>
                <WorkoutGridTable
                  exercises={exercises}
                  grid={grid}
                  selectedExerciseId={selectedExerciseId}
                  loading={loading}
                  onSelectExercise={selectExercise}
                  onMoveCell={moveEntry}
                  onUpdateCell={(payload) => {
                    void saveEntry(payload);
                    setProgressRefreshKey((k) => k + 1);
                  }}
                  onDeleteCell={(exerciseId, date) => {
                    void deleteEntry(exerciseId, date);
                    setProgressRefreshKey((k) => k + 1);
                  }}
                />
              </Suspense>
            ) : (
              <Suspense fallback={<InsightLoading wide />}>
                <WorkoutSessionList
                  points={sessionHistoryPoints}
                  exerciseName={primary?.exercise.name ?? selectedExercise?.name}
                  loading={progressLoading}
                  onEdit={openEditSession}
                  onDelete={async (point) => {
                    if (!selectedExerciseId) {
                      return;
                    }
                    await deleteEntry(selectedExerciseId, point.date);
                    setProgressRefreshKey((k) => k + 1);
                  }}
                />
              </Suspense>
            )}
          </section>
        </div>
      </AppPanel>

      <Modal
        title={entryModal?.isEdit ? "Edit session" : "Log session"}
        open={entryModal != null}
        onCancel={closeEntryModal}
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
              setProgressRefreshKey((k) => k + 1);
              closeEntryModal();
            }}
            onDelete={
              entryModal.isEdit
                ? async () => {
                    await deleteEntry(entryModal.draft.exerciseId, entryModal.draft.performedOn);
                    setProgressRefreshKey((k) => k + 1);
                    closeEntryModal();
                  }
                : undefined
            }
          />
        ) : null}
      </Modal>

      <Modal
        title={exerciseModal?.exerciseId ? "Edit exercise" : "Add exercise"}
        open={exerciseModal != null}
        onCancel={closeExerciseModal}
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
                await updateExercise(exerciseModal.exerciseId, name, muscleGroup);
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
