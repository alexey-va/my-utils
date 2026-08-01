import { useEffect, useMemo } from "react";
import { Button, Form, Input, Popconfirm, Select, Space } from "antd";
import type { ExerciseDraft } from "./types";
import { localizedMuscleGroupLabel, MUSCLE_GROUPS } from "./workoutMuscleGroups";
import { useWorkoutLocale } from "./workoutLocale";

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

export default function WorkoutExerciseForm({
  draft,
  saving,
  isEdit,
  onSubmit,
  onDelete,
}: Props) {
  const [form] = Form.useForm<FormValues>();
  const { locale, t } = useWorkoutLocale();
  const groupOptions = useMemo(
    () => MUSCLE_GROUPS.map((group) => ({
      value: group,
      label: localizedMuscleGroupLabel(group, locale),
    })),
    [locale],
  );

  useEffect(() => {
    form.setFieldsValue({ exerciseName: draft.name, muscleGroup: draft.muscleGroup });
  }, [draft, form]);

  return (
    <>
      <p className="workout-form__hint">
        {isEdit ? t("exercise.editHint") : t("exercise.addHint")}
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
          label={t("exercise.name")}
          rules={[{ required: true, message: t("exercise.enterName") }]}
        >
          <Input
            placeholder={t("exercise.example")}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-lpignore="true"
            data-1p-ignore
          />
        </Form.Item>
        <Form.Item name="muscleGroup" label={t("exercise.muscleGroup")}>
          <Select options={groupOptions} />
        </Form.Item>
        <Space wrap>
          <Button type="primary" htmlType="submit" loading={saving}>
            {isEdit ? t("common.update") : t("common.add")}
          </Button>
          <Button
            htmlType="button"
            disabled={saving}
            onClick={() =>
              form.setFieldsValue({ exerciseName: draft.name, muscleGroup: draft.muscleGroup })
            }
          >
            {t("common.reset")}
          </Button>
          {isEdit && onDelete ? (
            <Popconfirm
              title={t("progress.deleteExercise")}
              description={t("progress.deleteExerciseDescription")}
              onConfirm={() => void onDelete()}
              okText={t("common.delete")}
              okButtonProps={{ danger: true }}
            >
              <Button danger disabled={saving}>
                {t("common.delete")}
              </Button>
            </Popconfirm>
          ) : null}
        </Space>
      </Form>
    </>
  );
}
