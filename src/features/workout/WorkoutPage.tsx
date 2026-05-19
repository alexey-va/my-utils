import { useCallback, useMemo, useState } from "react";
import { Button, Space } from "antd";
import { DownloadOutlined, PlusOutlined, UpOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import PageLayout from "../../shared/components/PageLayout";
import AppPanel from "../../shared/components/AppPanel";
import type { ProgressMetric } from "../../api/types";
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
    progress,
    progressLoading,
    addExercise,
    updateExercise,
    deleteExercise,
    saveEntry,
  } = useWorkoutGrid();
  const [sessionOpen, setSessionOpen] = useState(false);
  const [metric, setMetric] = useState<ProgressMetric>("weight");
  const [activeCell, setActiveCell] = useState<WorkoutCellTarget>();
  const [editor, setEditor] = useState<FooterEditor | null>(null);

  const activeExerciseId = editor?.kind === "exercise" ? editor.draft.exerciseId : undefined;

  const openNewSession = useCallback(() => {
    const exercise = exercises.find((e) => e.id === selectedExerciseId);
    setActiveCell(undefined);
    setEditor({
      kind: "entry",
      draft: newSessionDraft(selectedExerciseId, exercise?.name),
    });
    setSessionOpen(true);
  }, [exercises, selectedExerciseId]);

  const openCellEditor = useCallback(
    (target: WorkoutCellTarget) => {
      const row = grid.rows.find((r) => r.exerciseId === target.exerciseId);
      setActiveCell(target);
      setEditor({
        kind: "entry",
        draft: entryDraftFromCell(target, row?.exerciseName ?? ""),
      });
      selectExercise(target.exerciseId);
      setSessionOpen(true);
    },
    [grid.rows, selectExercise],
  );

  const openExerciseEditor = useCallback(
    (exerciseId: string, exerciseName: string) => {
      setActiveCell(undefined);
      setEditor({
        kind: "exercise",
        draft: exerciseDraftFromExercise(exerciseId, exerciseName),
      });
      selectExercise(exerciseId);
      setSessionOpen(true);
    },
    [selectExercise],
  );

  const openAddExercise = useCallback(() => {
    setActiveCell(undefined);
    setEditor({ kind: "exercise", draft: exerciseDraftNew() });
    setSessionOpen(true);
  }, []);

  const isEntryEdit = editor?.kind === "entry" && Boolean(activeCell?.cell);

  const formTitle = useMemo(() => {
    if (!sessionOpen || !editor) {
      return null;
    }
    if (editor.kind === "exercise") {
      return editor.draft.exerciseId ? "Edit exercise" : "Add exercise";
    }
    return isEntryEdit ? "Edit session" : "Log session";
  }, [sessionOpen, editor, isEntryEdit]);

  return (
    <PageLayout
      title="Workout log"
      subtitle="Cell = session · exercise name = rename · + below table"
    >
      <AppPanel className="workout-panel">
        <div className="workout-shell">
          <div className="workout-shell__main">
            <section className="workout-shell__insights" aria-label="Progress">
              <h3 className="workout-shell__label">Progress</h3>
              <WorkoutProgressPanel
                progress={progress}
                loading={progressLoading}
                metric={metric}
                onMetricChange={setMetric}
                onDelete={() => {
                  if (selectedExerciseId) {
                    void deleteExercise(selectedExerciseId);
                  }
                }}
              />
            </section>

            <section className="workout-shell__log" aria-label="Training log">
              <div className="workout-shell__log-header">
                <h3 className="workout-shell__label">Log</h3>
                <Button
                  size="small"
                  icon={<DownloadOutlined />}
                  disabled={!grid.rows.length}
                  onClick={() => exportWorkoutGridCsv(grid)}
                >
                  Export CSV
                </Button>
              </div>
              <div className="workout-matrix-wrap">
                <WorkoutMatrixTable
                  grid={grid}
                  loading={loading}
                  selectedExerciseId={selectedExerciseId}
                  activeCell={activeCell}
                  activeExerciseId={activeExerciseId}
                  onSelectExercise={selectExercise}
                  onCellSelect={openCellEditor}
                  onExerciseSelect={openExerciseEditor}
                  onAddExercise={openAddExercise}
                />
              </div>
            </section>
          </div>

          <footer className="workout-shell__footer">
            <Space wrap>
              <Button
                type={sessionOpen ? "default" : "primary"}
                icon={sessionOpen ? <UpOutlined /> : <PlusOutlined />}
                onClick={() => (sessionOpen ? setSessionOpen(false) : openNewSession())}
              >
                {sessionOpen ? "Hide form" : "Log session"}
              </Button>
              {formTitle ? <span className="workout-shell__form-title">{formTitle}</span> : null}
            </Space>

            {sessionOpen && editor ? (
              <div className="workout-shell__form">
                {editor.kind === "entry" ? (
                  <WorkoutEntryForm
                    key={editor.draft.key}
                    saving={saving}
                    draft={editor.draft}
                    isEdit={isEntryEdit}
                    onSubmit={async (values) => {
                      await saveEntry(values);
                      setSessionOpen(false);
                      setEditor(null);
                      setActiveCell(undefined);
                    }}
                  />
                ) : (
                  <WorkoutExerciseForm
                    key={editor.draft.key}
                    draft={editor.draft}
                    saving={saving}
                    isEdit={Boolean(editor.draft.exerciseId)}
                    onSubmit={async (name) => {
                      if (editor.draft.exerciseId) {
                        await updateExercise(editor.draft.exerciseId, name);
                      } else {
                        await addExercise(name);
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
          </footer>
        </div>
      </AppPanel>
    </PageLayout>
  );
}
