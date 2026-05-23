import { useEffect } from "react";
import { Button, DatePicker, Form, InputNumber, Popconfirm, Space } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import type { UpsertWorkoutEntryRequest, WorkoutCell } from "../../api/types";
import type { WorkoutEntryDraft } from "./types";

type FormValues = {
  performedOn: Dayjs;
  weightKg: number;
  setCount: number;
  repsPerSet: number;
  maxReps: number;
};

type Props = {
  saving: boolean;
  draft: WorkoutEntryDraft;
  isEdit: boolean;
  lastSession?: WorkoutCell;
  onSubmit: (values: UpsertWorkoutEntryRequest) => Promise<void>;
  onDelete?: () => Promise<void>;
};

function draftToFormValues(draft: WorkoutEntryDraft): FormValues {
  return {
    performedOn: dayjs(`${draft.performedOn}T12:00:00`),
    weightKg: draft.weightKg,
    setCount: draft.setCount,
    repsPerSet: draft.repsPerSet,
    maxReps: draft.maxReps,
  };
}

function lastSessionToFormValues(cell: WorkoutCell, performedOn: Dayjs): FormValues {
  return {
    performedOn,
    weightKg: cell.weightKg,
    setCount: cell.setCount,
    repsPerSet: cell.repsPerSet,
    maxReps: cell.maxReps,
  };
}

function bumpWeight(
  form: ReturnType<typeof Form.useForm<FormValues>>[0],
  delta: number,
) {
  const current = form.getFieldValue("weightKg") ?? 0;
  form.setFieldValue("weightKg", Math.max(1, Math.round(current + delta)));
}

export default function WorkoutEntryForm({
  saving,
  draft,
  isEdit,
  lastSession,
  onSubmit,
  onDelete,
}: Props) {
  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    form.setFieldsValue(draftToFormValues(draft));
  }, [draft, form]);

  return (
    <>
      <p className="workout-form__hint">
        <strong>{draft.exerciseName}</strong>
        {" · "}
        {isEdit ? "edit session" : "new session"}
        {" · "}
        {draft.performedOn}
      </p>
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
        className="workout-form"
        onFinish={async (values) => {
          await onSubmit({
            exerciseId: draft.exerciseId,
            performedOn: values.performedOn.format("YYYY-MM-DD"),
            weightKg: Math.round(values.weightKg),
            setCount: values.setCount,
            repsPerSet: values.repsPerSet,
            maxReps: values.maxReps,
          });
        }}
      >
        <div className="workout-form__grid">
          <Form.Item
            name="performedOn"
            label="Date"
            rules={[{ required: true, message: "Pick a date" }]}
          >
            <DatePicker
              className="workout-form__full"
              format="YYYY-MM-DD"
              autoComplete="off"
            />
          </Form.Item>
          <Form.Item
            name="weightKg"
            label="Weight (kg)"
            rules={[{ required: true, message: "Enter weight" }]}
          >
            <InputNumber className="workout-form__full" min={1} step={1} precision={0} autoComplete="off" />
          </Form.Item>
          <Form.Item label=" " colon={false} className="workout-form__weight-bumps">
            <Space wrap size={4}>
              <Button size="small" disabled={saving} onClick={() => bumpWeight(form, -5)}>
                −5
              </Button>
              <Button size="small" disabled={saving} onClick={() => bumpWeight(form, -2.5)}>
                −2.5
              </Button>
              <Button size="small" disabled={saving} onClick={() => bumpWeight(form, 2.5)}>
                +2.5
              </Button>
              <Button size="small" disabled={saving} onClick={() => bumpWeight(form, 5)}>
                +5
              </Button>
            </Space>
          </Form.Item>
          <Form.Item
            name="setCount"
            label="Sets"
            rules={[{ required: true, message: "Enter sets" }]}
          >
            <InputNumber className="workout-form__full" min={1} step={1} precision={0} autoComplete="off" />
          </Form.Item>
          <Form.Item
            name="repsPerSet"
            label="Reps per set"
            rules={[{ required: true, message: "Enter reps" }]}
          >
            <InputNumber className="workout-form__full" min={1} step={1} precision={0} autoComplete="off" />
          </Form.Item>
          <Form.Item
            name="maxReps"
            label="Max on last set"
            rules={[{ required: true, message: "Enter max reps" }]}
          >
            <InputNumber className="workout-form__full" min={1} step={1} precision={0} autoComplete="off" />
          </Form.Item>
        </div>
        <div className="workout-form__actions">
          <Button type="primary" htmlType="submit" loading={saving}>
            {isEdit ? "Update" : "Save"}
          </Button>
          <Button
            type="default"
            htmlType="button"
            className="workout-form__action-slot"
            disabled={saving || isEdit || !lastSession}
            tabIndex={!isEdit && lastSession ? 0 : -1}
            aria-hidden={isEdit || !lastSession}
            onClick={() =>
              form.setFieldsValue(
                lastSessionToFormValues(lastSession!, form.getFieldValue("performedOn")),
              )
            }
          >
            Same as last
          </Button>
          <Button
            htmlType="button"
            disabled={saving}
            onClick={() => form.setFieldsValue(draftToFormValues(draft))}
          >
            Reset
          </Button>
          <span className="workout-form__action-slot">
            {isEdit && onDelete ? (
              <Popconfirm
                title="Delete this session?"
                description={`Remove ${draft.exerciseName} on ${draft.performedOn} from the log.`}
                onConfirm={() => void onDelete()}
                okText="Delete"
                okButtonProps={{ danger: true }}
              >
                <Button danger disabled={saving}>
                  Delete session
                </Button>
              </Popconfirm>
            ) : (
              <Button danger disabled className="workout-form__action-placeholder" aria-hidden tabIndex={-1}>
                Delete session
              </Button>
            )}
          </span>
        </div>
      </Form>
    </>
  );
}
