import { useEffect, useState } from "react";
import { Modal, message } from "antd";
import WorkoutGridCellEditor from "./WorkoutGridCellEditor";
import type { WorkoutGridCellEditorSession } from "./workoutGridDnD";
import { useWorkoutLocale } from "./workoutLocale";

type Props = {
  session: WorkoutGridCellEditorSession | null;
  onClose: () => void;
  onSave: (session: WorkoutGridCellEditorSession, weightKg: number, repsPattern: string) => void;
  onDelete?: (session: WorkoutGridCellEditorSession) => void;
};

export default function WorkoutGridCellEditorModal({
  session,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const { t } = useWorkoutLocale();
  const [weightKg, setWeightKg] = useState(session?.weightKg ?? 20);
  const [repsPattern, setRepsPattern] = useState(session?.repsPattern ?? "10");

  useEffect(() => {
    if (session) {
      setWeightKg(session.weightKg);
      setRepsPattern(session.repsPattern);
    }
  }, [session]);

  const save = () => {
    if (!session) {
      return;
    }
    try {
      onSave(session, weightKg, repsPattern);
      onClose();
    } catch {
      message.error(t("error.invalidValue"));
    }
  };

  const title = session
    ? `${session.mode === "add" ? t("grid.addSession") : t("grid.editSession")} · ${session.exerciseName} · ${session.dateLabel}`
    : "";

  return (
    <Modal
      open={session != null}
      title={title}
      onCancel={onClose}
      footer={null}
      width={300}
      centered
      destroyOnHidden
      maskClosable
      className="workout-grid__cell-modal"
      wrapClassName="workout-grid__cell-modal-wrap"
    >
      {session ? (
        <WorkoutGridCellEditor
          mode={session.mode}
          weightKg={weightKg}
          repsPattern={repsPattern}
          onWeightChange={setWeightKg}
          onRepsChange={setRepsPattern}
          onSave={save}
          onDelete={
            onDelete
              ? () => {
                  onDelete(session);
                  onClose();
                }
              : undefined
          }
        />
      ) : null}
    </Modal>
  );
}
