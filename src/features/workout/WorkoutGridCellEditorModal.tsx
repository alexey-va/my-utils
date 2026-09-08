import { useEffect, useRef, useState } from "react";
import { Alert, Modal } from "antd";
import WorkoutGridCellEditor from "./WorkoutGridCellEditor";
import type { WorkoutGridCellEditorSession } from "./workoutGridDnD";
import { useWorkoutLocale } from "./workoutLocale";

type Props = {
  session: WorkoutGridCellEditorSession | null;
  onClose: () => void;
  onSave: (
    session: WorkoutGridCellEditorSession,
    weightKg: number,
    repsPattern: string,
  ) => void | Promise<void>;
  onDelete?: (session: WorkoutGridCellEditorSession) => void | Promise<unknown>;
};

export default function WorkoutGridCellEditorModal({
  session,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const { t } = useWorkoutLocale();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const pending = useRef(false);
  const [weightKg, setWeightKg] = useState(session?.weightKg ?? 20);
  const [repsPattern, setRepsPattern] = useState(session?.repsPattern ?? "10");

  useEffect(() => {
    if (session) {
      setError(false);
      setWeightKg(session.weightKg);
      setRepsPattern(session.repsPattern);
    }
  }, [session]);

  const perform = async (operation: () => void | Promise<unknown>) => {
    if (!session || pending.current) return;
    pending.current = true;
    setSaving(true);
    setError(false);
    try {
      await operation();
      onClose();
    } catch {
      setError(true);
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };

  const title = session
    ? `${session.mode === "add" ? t("grid.addSession") : t("grid.editSession")} · ${session.exerciseName} · ${session.dateLabel}`
    : "";

  return (
    <Modal
      open={session != null}
      title={title}
      onCancel={() => {
        if (!saving) onClose();
      }}
      closable={!saving}
      keyboard={!saving}
      footer={null}
      width={300}
      centered
      destroyOnHidden
      maskClosable={!saving}
      className="workout-grid__cell-modal"
      wrapClassName="workout-grid__cell-modal-wrap"
    >
      {error ? (
        <Alert type="error" showIcon message={t("message.saveFailed")} />
      ) : null}
      {session ? (
        <WorkoutGridCellEditor
          mode={session.mode}
          saving={saving}
          weightKg={weightKg}
          repsPattern={repsPattern}
          onWeightChange={setWeightKg}
          onRepsChange={setRepsPattern}
          onSave={() =>
            void perform(() => onSave(session, weightKg, repsPattern))
          }
          onDelete={
            onDelete ? () => void perform(() => onDelete(session)) : undefined
          }
        />
      ) : null}
    </Modal>
  );
}
