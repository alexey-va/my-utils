import { useEffect } from "react";
import { Button, Form, Input, Popconfirm, Select, Space } from "antd";
import type { ExerciseDraft } from "./types";
import { MUSCLE_GROUPS, MUSCLE_GROUP_LABELS } from "./workoutMuscleGroups";

type FormValues = {
  exerciseName: string;
  muscleGroup: string;
};

type Props = {
  draft: ExerciseDraft;
  saving: boolean;
  isEdit: boolean;
  onSubmit: (name: string, muscleGroup: string) => Promise<void>;
  onDelete?: () => Promise<void>;
};

const GROUP_OPTIONS = MUSCLE_GROUPS.map((g) => ({
  value: g,
  label: MUSCLE_GROUP_LABELS[g],
}));

export default function WorkoutExerciseForm({
  draft,
  saving,
  isEdit,
  onSubmit,
  onDelete,
}: Props) {
  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    form.setFieldsValue({ exerciseName: draft.name, muscleGroup: draft.muscleGroup });
  }, [draft, form]);

  return (
    <>
      <p className="workout-form__hint">
        {isEdit ? "Rename or re-tag this exercise." : "Add a new exercise type to the log."}
      </p>
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
        className="workout-form workout-form--exercise"
        onFinish={async (values) => {
          await onSubmit(values.exerciseName.trim(), values.muscleGroup);
        }}
      >
        <Form.Item
          name="exerciseName"
          label="Exercise name"
          rules={[{ required: true, message: "Enter a name" }]}
        >
          <Input
            placeholder="e.g. Bench press"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-lpignore="true"
            data-1p-ignore
          />
        </Form.Item>
        <Form.Item name="muscleGroup" label="Muscle group">
          <Select options={GROUP_OPTIONS} />
        </Form.Item>
        <Space wrap>
          <Button type="primary" htmlType="submit" loading={saving}>
            {isEdit ? "Update" : "Add"}
          </Button>
          <Button
            htmlType="button"
            disabled={saving}
            onClick={() =>
              form.setFieldsValue({ exerciseName: draft.name, muscleGroup: draft.muscleGroup })
            }
          >
            Reset
          </Button>
          {isEdit && onDelete ? (
            <Popconfirm
              title="Delete this exercise?"
              description="All logged sessions for it will be removed."
              onConfirm={() => void onDelete()}
              okText="Delete"
              okButtonProps={{ danger: true }}
            >
              <Button danger disabled={saving}>
                Delete
              </Button>
            </Popconfirm>
          ) : null}
        </Space>
      </Form>
    </>
  );
}
