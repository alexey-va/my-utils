import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Input, Space } from "antd";
import type { InputRef } from "antd";
import { DownloadOutlined, PlusOutlined, SearchOutlined, UpOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import PageLayout from "../../shared/components/PageLayout";
import AppPanel from "../../shared/components/AppPanel";
import type { ProgressMetric } from "../../api/types";
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
import WorkoutWeeklySummary from "./WorkoutWeeklySummary";
import { exportWorkoutGridCsv } from "./exportWorkoutGridCsv";
import WorkoutEntryForm from "./WorkoutEntryForm";
import WorkoutExerciseForm from "./WorkoutExerciseForm";
import WorkoutMatrixTable from "./WorkoutMatrixTable";
import WorkoutProgressPanel from "./WorkoutProgressPanel";
import {
  entryDraftFromCell,
  exerciseDraftFromExercise,
  exerciseDraftNew,
  type FooterEditor,
  type WorkoutCellTarget,
  type WorkoutEntryDraft,
} from "./types";
import { useCompareProgress } from "./useCompareProgress";
import { useWorkoutGrid } from "./useWorkoutGrid";

function newSessionDraft(exerciseId?: string, exerciseName?: string): WorkoutEntryDraft {
  const today = dayjs().format("YYYY-MM-DD");
  return {
    key: `new-${today}-${exerciseId ?? "none"}`,
    exerciseId: exerciseId ?? "",
    exerciseName: exerciseName ?? "",
    performedOn: today,
    weightKg: 20,
    setCount: 3,
    repsPerSet: 10,
    maxReps: 10,
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
  } = useWorkoutGrid();
  const [sessionOpen, setSessionOpen] = useState(false);
  const [metric, setMetric] = useState<ProgressMetric>("weight");
  const [period, setPeriod] = useState<ProgressPeriod>("p12");

  const weeklySummary = useMemo(() => computeWeeklySummary(grid), [grid]);
  const muscleGroupVolumes = useMemo(
    () => computeMuscleGroupVolumeThisWeek(grid, exercises),
    [grid, exercises],
  );

  const handleExerciseRowClick = useCallback(
    (exerciseId: string, multi: boolean) => {
      selectExercise(exerciseId);
      if (multi) {
        setChartExerciseIds((prev) => {
          if (prev.includes(exerciseId)) {
            const next = prev.filter((id) => id !== exerciseId);
            return next.length > 0 ? next : [exerciseId];
          }
          return [...prev, exerciseId];
        });
      } else {
        setChartExerciseIds([exerciseId]);
      }
    },
    [selectExercise],
  );
  const [activeCell, setActiveCell] = useState<WorkoutCellTarget>();
  const [editor, setEditor] = useState<FooterEditor | null>(null);
  const [filterQuery, setFilterQuery] = useState("");
  const [chartExerciseIds, setChartExerciseIds] = useState<string[]>([]);
  const [progressRefreshKey, setProgressRefreshKey] = useState(0);
  const searchRef = useRef<InputRef>(null);

  const { series, primary, loading: progressLoading, prefetchExercise } = useCompareProgress(
    chartExerciseIds,
    selectedExerciseId,
    progressRefreshKey,
  );

  const sessionHistoryPoints = useMemo(
    () => filterPointsByPeriod(primary?.points ?? [], period),
    [primary?.points, period],
  );

  useEffect(() => {
    if (selectedExerciseId && chartExerciseIds.length === 0) {
      setChartExerciseIds([selectedExerciseId]);
    }
  }, [selectedExerciseId, chartExerciseIds.length]);

  const activeExerciseId = editor?.kind === "exercise" ? editor.draft.exerciseId : undefined;

  const openNewSession = useCallback(
    (overrideExerciseId?: string) => {
      const exerciseId = overrideExerciseId ?? selectedExerciseId;
      const exercise = exercises.find((e) => e.id === exerciseId);
      const row = grid.rows.find((r) => r.exerciseId === exerciseId);
      const last = row ? lastSessionForRow(row, grid.dates) : undefined;
      const today = dayjs().format("YYYY-MM-DD");
      setActiveCell(undefined);
      setEditor({
        kind: "entry",
        draft: {
          ...newSessionDraft(exerciseId, exercise?.name),
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
      if (exerciseId) {
        selectExercise(exerciseId);
      }
      setSessionOpen(true);
    },
    [exercises, grid.dates, grid.rows, selectedExerciseId, selectExercise],
  );

  const openCellEditor = useCallback(
    (target: WorkoutCellTarget) => {
      const row = grid.rows.find((r) => r.exerciseId === target.exerciseId);
      const last =
        row && !target.cell ? lastSessionForRow(row, grid.dates) : undefined;
      setActiveCell(target);
      setEditor({
        kind: "entry",
        draft: entryDraftFromCell(target, row?.exerciseName ?? "", last),
      });
      selectExercise(target.exerciseId);
      setSessionOpen(true);
    },
    [grid.dates, grid.rows, selectExercise],
  );

  const openExerciseEditor = useCallback(
    (exerciseId: string, exerciseName: string) => {
      const exercise = exercises.find((e) => e.id === exerciseId);
      setActiveCell(undefined);
      setEditor({
        kind: "exercise",
        draft: exerciseDraftFromExercise(
          exerciseId,
          exerciseName,
          normalizeMuscleGroup(exercise?.muscleGroup),
        ),
      });
      selectExercise(exerciseId);
    },
    [exercises, selectExercise],
  );

  const openAddExercise = useCallback(() => {
    setActiveCell(undefined);
    setEditor({ kind: "exercise", draft: exerciseDraftNew() });
  }, []);

  const isEntryEdit = editor?.kind === "entry" && Boolean(activeCell?.cell);

  const editorActionLabel = useMemo(() => {
    if (!editor) {
      return "Log session";
    }
    if (editor.kind === "exercise") {
      return editor.draft.exerciseId ? "Edit exercise" : "Add exercise";
    }
    return isEntryEdit ? "Edit session" : "Log session";
  }, [editor, isEntryEdit]);

  const toggleButtonLabel = sessionOpen ? "Hide form" : editorActionLabel;

  const formTitle = sessionOpen && editor ? editorActionLabel : null;

  const entryLastSession = useMemo(() => {
    if (editor?.kind !== "entry" || isEntryEdit) {
      return undefined;
    }
    const row = grid.rows.find((r) => r.exerciseId === editor.draft.exerciseId);
    return row ? lastSessionForRow(row, grid.dates) : undefined;
  }, [editor, grid.dates, grid.rows, isEntryEdit]);

  const closeForm = useCallback(() => {
    setSessionOpen(false);
    setEditor(null);
    setActiveCell(undefined);
  }, []);

  useWorkoutShortcuts({
    onLogSession: () => {
      if (sessionOpen) {
        closeForm();
      } else if (editor?.kind === "entry") {
        setSessionOpen(true);
      } else {
        openNewSession();
      }
    },
    onCloseForm: () => {
      if (sessionOpen || editor) {
        closeForm();
      }
    },
    onFocusSearch: () => searchRef.current?.focus(),
  });

  return (
    <PageLayout title="Workout log">
      <AppPanel className="workout-panel">
        <div className="workout-shell">
          <div className="workout-shell__main">
            <section className="workout-shell__insights" aria-label="Progress">
              <h3 className="workout-shell__label">Progress</h3>
              <WorkoutWeeklySummary summary={weeklySummary} />
              <WorkoutMuscleGroupSummary volumes={muscleGroupVolumes} />
              <WorkoutProgressPanel
                series={series}
                compareCount={chartExerciseIds.length}
                primary={primary}
                loading={progressLoading}
                metric={metric}
                period={period}
                onMetricChange={setMetric}
                onPeriodChange={setPeriod}
                onDelete={() => {
                  if (selectedExerciseId) {
                    void deleteExercise(selectedExerciseId).then(() => {
                      setChartExerciseIds((prev) =>
                        prev.filter((id) => id !== selectedExerciseId),
                      );
                    });
                  }
                }}
              />
            </section>

            <section className="workout-shell__log" aria-label="Training log">
              <div className="workout-shell__log-header">
                <h3 className="workout-shell__label">Log</h3>
                <Space wrap size="small">
                  <Input
                    ref={searchRef}
                    className="workout-log-search"
                    size="small"
                    allowClear
                    placeholder="Filter exercises"
                    prefix={<SearchOutlined />}
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    aria-label="Filter exercises"
                  />
                  <Button
                    size="small"
                    icon={<DownloadOutlined />}
                    disabled={!grid.rows.length}
                    onClick={() => exportWorkoutGridCsv(grid)}
                  >
                    Export CSV
                  </Button>
                </Space>
              </div>
              <WorkoutMatrixTable
                grid={grid}
                loading={loading}
                filterQuery={filterQuery}
                primaryExerciseId={selectedExerciseId}
                chartExerciseIds={chartExerciseIds}
                chartSeries={series}
                activeCell={activeCell}
                activeExerciseId={activeExerciseId}
                onExerciseRowClick={handleExerciseRowClick}
                onPrimarySelect={selectExercise}
                onCellSelect={openCellEditor}
                onExerciseSelect={openExerciseEditor}
                onAddExercise={openAddExercise}
                onPrefetchExercise={prefetchExercise}
              />
            </section>

            <section
              className={`workout-shell__editor${sessionOpen && editor ? " workout-shell__editor--open" : ""}`}
              aria-label="Log or edit session"
            >
              <div className="workout-shell__editor-bar">
                <Space wrap>
                  <Button
                    type={sessionOpen ? "default" : "primary"}
                    icon={sessionOpen ? <UpOutlined /> : <PlusOutlined />}
                    onClick={() => {
                      if (sessionOpen) {
                        setSessionOpen(false);
                      } else if (editor) {
                        setSessionOpen(true);
                      } else {
                        openNewSession();
                      }
                    }}
                  >
                    {toggleButtonLabel}
                  </Button>
                  {formTitle ? <span className="workout-shell__form-title">{formTitle}</span> : null}
                  <span className="workout-shell__keys" aria-hidden>
                    <kbd>N</kbd> log · <kbd>/</kbd> search · <kbd>Tab</kbd> cells · <kbd>Esc</kbd> close
                  </span>
                </Space>
              </div>

              <div className="workout-shell__form-collapse">
                <div className="workout-shell__form-inner">
                  {editor ? (
                    <div className="workout-shell__form">
                      {editor.kind === "entry" ? (
                        <WorkoutEntryForm
                          key={editor.draft.key}
                          saving={saving}
                          draft={editor.draft}
                          isEdit={isEntryEdit}
                          lastSession={entryLastSession}
                          onSubmit={async (values) => {
                            await saveEntry(values);
                            setProgressRefreshKey((k) => k + 1);
                            closeForm();
                          }}
                          onDelete={
                            isEntryEdit && activeCell?.cell
                              ? async () => {
                                  const exerciseId = editor.draft.exerciseId;
                                  await deleteEntry(exerciseId, editor.draft.performedOn);
                                  setProgressRefreshKey((k) => k + 1);
                                  openNewSession(exerciseId);
                                }
                              : undefined
                          }
                        />
                      ) : (
                        <WorkoutExerciseForm
                          key={editor.draft.key}
                          draft={editor.draft}
                          saving={saving}
                          isEdit={Boolean(editor.draft.exerciseId)}
                          onSubmit={async (name, muscleGroup) => {
                            if (editor.draft.exerciseId) {
                              await updateExercise(editor.draft.exerciseId, name, muscleGroup);
                            } else {
                              await addExercise(name, muscleGroup);
                            }
                            setSessionOpen(false);
                            setEditor(null);
                          }}
                          onDelete={
                            editor.draft.exerciseId
                              ? async () => {
                                  await deleteExercise(editor.draft.exerciseId!);
                                  setSessionOpen(false);
                                  setEditor(null);
                                }
                              : undefined
                          }
                        />
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="workout-shell__sessions" aria-label="Session history">
              <WorkoutSessionList
                points={sessionHistoryPoints}
                exerciseName={primary?.exercise.name}
                loading={progressLoading}
              />
            </section>
          </div>
        </div>
      </AppPanel>
    </PageLayout>
  );
}
