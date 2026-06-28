import { Button, Input, InputNumber, Space } from "antd";

type Props = {
  mode: "add" | "edit";
  weightKg: number;
  repsPattern: string;
  onWeightChange: (value: number) => void;
  onRepsChange: (value: string) => void;
  onSave: () => void;
  onDelete?: () => void;
};

export default function WorkoutGridCellEditor({
  mode,
  weightKg,
  repsPattern,
  onWeightChange,
  onRepsChange,
  onSave,
  onDelete,
}: Props) {
  return (
    <div className="workout-grid__cell-popover-inner">
      <Space.Compact className="workout-grid__cell-popover-row">
        <InputNumber
          className="workout-grid__cell-popover-weight"
          min={1}
          step={1}
          precision={0}
          size="small"
          value={weightKg}
          addonAfter="kg"
          onChange={(value) => onWeightChange(Math.max(1, Math.round(value ?? 1)))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSave();
            }
          }}
        />
        <Input
          className="workout-grid__cell-popover-reps"
          size="small"
          value={repsPattern}
          placeholder="10/10/9/9"
          onChange={(e) => onRepsChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSave();
            }
          }}
        />
      </Space.Compact>
      <div className="workout-grid__cell-popover-actions">
        <Button type="primary" size="small" onClick={onSave}>
          {mode === "add" ? "Add" : "Update"}
        </Button>
        {onDelete ? (
          <Button danger size="small" onClick={onDelete}>
            Delete
          </Button>
        ) : null}
      </div>
    </div>
  );
}
