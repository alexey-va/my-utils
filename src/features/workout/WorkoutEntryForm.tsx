import { useEffect } from "react";
import { Button, DatePicker, Form, InputNumber, Space } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import type { UpsertWorkoutEntryRequest } from "../../api/types";
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
  onSubmit: (values: UpsertWorkoutEntryRequest) => Promise<void>;
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

export default function WorkoutEntryForm({ saving, draft, isEdit, onSubmit }: Props) {
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
            <DatePicker className="workout-form__full" format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item
            name="weightKg"
            label="Weight (kg)"
            rules={[{ required: true, message: "Enter weight" }]}
          >
            <InputNumber className="workout-form__full" min={1} step={1} precision={0} />
          </Form.Item>
          <Form.Item
            name="setCount"
            label="Sets"
            rules={[{ required: true, message: "Enter sets" }]}
          >
            <InputNumber className="workout-form__full" min={1} step={1} precision={0} />
          </Form.Item>
          <Form.Item
            name="repsPerSet"
            label="Reps per set"
            rules={[{ required: true, message: "Enter reps" }]}
          >
            <InputNumber className="workout-form__full" min={1} step={1} precision={0} />
          </Form.Item>
          <Form.Item
            name="maxReps"
            label="Max on last set"
            rules={[{ required: true, message: "Enter max reps" }]}
          >
            <InputNumber className="workout-form__full" min={1} step={1} precision={0} />
          </Form.Item>
        </div>
        <Space>
          <Button type="primary" htmlType="submit" loading={saving}>
            {isEdit ? "Update" : "Save"}
          </Button>
          <Button
            htmlType="button"
            disabled={saving}
            onClick={() => form.setFieldsValue(draftToFormValues(draft))}
          >
            Reset
          </Button>
        </Space>
      </Form>
    </>
  );
}
