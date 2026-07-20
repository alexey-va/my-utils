import { useCallback, useMemo, useRef, useState } from "react";
import { Modal } from "antd";
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
import WorkoutSessionList from "./WorkoutSessionList";
import WorkoutGridTable from "./WorkoutGridTable";
import WorkoutWeeklySummary from "./WorkoutWeeklySummary";
import { exportWorkoutGridCsv } from "./exportWorkoutGridCsv";
import WorkoutEntryForm from "./WorkoutEntryForm";
import WorkoutExerciseForm from "./WorkoutExerciseForm";
import WorkoutExerciseBar from "./WorkoutExerciseBar";
import WorkoutProgressPanel from "./WorkoutProgressPanel";
import WorkoutStepsChart, { type StepsPeriod } from "./WorkoutStepsChart";
import WorkoutBodyWeightChart, { type WeightPeriod } from "./WorkoutBodyWeightChart";
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

  const { history: stepsHistory, loading: stepsLoading } = useStepsHistory(90);
  const { history: weightHistory, loading: weightLoading } = useBodyWeightHistory(90);

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
      subtitle="Today’s training, progress, and activity in one focused view."
    >
      <AppPanel className="workout-panel">
        <div className="workout-shell workout-shell--simple">
          <section className="workout-shell__insights" aria-label="Progress">
            <WorkoutWeeklySummary summary={weeklySummary} />
            <WorkoutStepsChart
              days={stepsHistory?.days ?? []}
              todaySteps={stepsHistory?.todaySteps ?? null}
              loading={stepsLoading}
              period={stepsPeriod}
              onPeriodChange={setStepsPeriod}
            />
            <WorkoutBodyWeightChart
              days={weightHistory?.days ?? []}
              latestWeightKg={weightHistory?.latestWeightKg ?? null}
              latestDate={weightHistory?.latestDate ?? null}
              loading={weightLoading}
              period={weightPeriod}
              onPeriodChange={setWeightPeriod}
            />
            <WorkoutMuscleGroupSummary volumes={muscleGroupVolumes} />
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
            ) : (
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
            )}
          </section>
        </div>
      </AppPanel>

      <Modal
        title={entryModal?.isEdit ? "Edit session" : "Log session"}
        open={entryModal != null}
        onCancel={closeEntryModal}
        footer={null}
        destroyOnClose
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
        destroyOnClose
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
