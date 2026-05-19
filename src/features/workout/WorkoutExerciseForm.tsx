import { useEffect } from "react";
import { Button, Form, Input, Popconfirm, Space } from "antd";
import type { ExerciseDraft } from "./types";

type FormValues = {
  name: string;
};

type Props = {
  draft: ExerciseDraft;
  saving: boolean;
  isEdit: boolean;
  onSubmit: (name: string) => Promise<void>;
  onDelete?: () => Promise<void>;
};

export default function WorkoutExerciseForm({
  draft,
  saving,
  isEdit,
  onSubmit,
  onDelete,
}: Props) {
  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    form.setFieldsValue({ name: draft.name });
  }, [draft, form]);

  return (
    <>
      <p className="workout-form__hint">
        {isEdit ? "Rename this exercise type." : "Add a new exercise type to the log."}
      </p>
      <Form
        form={form}
        layout="vertical"
        className="workout-form workout-form--exercise"
        onFinish={async (values) => {
          await onSubmit(values.name.trim());
        }}
      >
        <Form.Item
          name="name"
          label="Exercise name"
          rules={[{ required: true, message: "Enter a name" }]}
        >
          <Input placeholder="e.g. Bench press" autoFocus />
        </Form.Item>
        <Space wrap>
          <Button type="primary" htmlType="submit" loading={saving}>
            {isEdit ? "Update" : "Add"}
          </Button>
          <Button htmlType="button" disabled={saving} onClick={() => form.setFieldsValue({ name: draft.name })}>
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
