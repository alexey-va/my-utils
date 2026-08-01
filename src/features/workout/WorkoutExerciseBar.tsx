import type { Ref } from "react";
import { Button, Select, Space } from "antd";
import type { RefSelectProps } from "antd/es/select";
import {
  AppstoreOutlined,
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import type { Exercise } from "../../api/types";
import { useWorkoutLocale } from "./workoutLocale";

type Props = {
  exercises: Exercise[];
  selectedExerciseId?: string;
  loading?: boolean;
  selectRef?: Ref<RefSelectProps>;
  onSelect: (exerciseId: string) => void;
  onLogSession: () => void;
  onAddExercise: () => void;
  onEditExercise: () => void;
  onExportCsv: () => void;
  canExport: boolean;
  showAllExercises?: boolean;
  onToggleAllExercises?: () => void;
};

export default function WorkoutExerciseBar({
  exercises,
  selectedExerciseId,
  loading,
  selectRef,
  onSelect,
  onLogSession,
  onAddExercise,
  onEditExercise,
  onExportCsv,
  canExport,
  showAllExercises = false,
  onToggleAllExercises,
}: Props) {
  const { t } = useWorkoutLocale();
  const options = exercises.map((e) => ({
    value: e.id,
    label: e.name,
  }));

  return (
    <div className="workout-toolbar">
      <Select
        ref={selectRef}
        className="workout-toolbar__select"
        showSearch
        placeholder={t("toolbar.selectExercise")}
        optionFilterProp="label"
        loading={loading}
        disabled={!exercises.length}
        value={selectedExerciseId}
        options={options}
        onChange={onSelect}
        aria-label={t("toolbar.exerciseAria")}
      />
      <Space wrap size="small" className="workout-toolbar__actions">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          disabled={!selectedExerciseId}
          onClick={onLogSession}
        >
          {t("toolbar.logSession")}
        </Button>
        <Button icon={<PlusOutlined />} onClick={onAddExercise}>
          {t("toolbar.addExercise")}
        </Button>
        <Button
          icon={showAllExercises ? <UnorderedListOutlined /> : <AppstoreOutlined />}
          disabled={!exercises.length || !onToggleAllExercises}
          onClick={onToggleAllExercises}
        >
          {showAllExercises ? t("toolbar.sessions") : t("toolbar.trainingGrid")}
        </Button>
        <Button
          icon={<EditOutlined />}
          disabled={!selectedExerciseId}
          onClick={onEditExercise}
        >
          {t("toolbar.editExercise")}
        </Button>
        <Button
          icon={<DownloadOutlined />}
          disabled={!canExport}
          onClick={onExportCsv}
        >
          {t("toolbar.exportCsv")}
        </Button>
        <span className="workout-toolbar__keys" aria-hidden>
          <kbd>N</kbd> {t("toolbar.shortcuts").split(" · ")[0]} · <kbd>/</kbd>{" "}
          {t("toolbar.shortcuts").split(" · ")[1]}
        </span>
      </Space>
    </div>
  );
}
