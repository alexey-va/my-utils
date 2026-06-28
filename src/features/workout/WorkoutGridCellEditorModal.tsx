import { useEffect, useState } from "react";
import { Modal, message } from "antd";
import WorkoutGridCellEditor from "./WorkoutGridCellEditor";
import type { WorkoutGridCellEditorSession } from "./workoutGridDnD";

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
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Invalid value");
    }
  };

  const title = session
    ? `${session.mode === "add" ? "Add session" : "Edit session"} · ${session.exerciseName} · ${session.dateLabel}`
    : "";

  return (
    <Modal
      open={session != null}
      title={title}
      onCancel={onClose}
      footer={null}
      width={300}
      centered
      destroyOnClose
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
