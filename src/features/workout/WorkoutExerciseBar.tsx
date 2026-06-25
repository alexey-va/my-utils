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
        placeholder="Select exercise"
        optionFilterProp="label"
        loading={loading}
        disabled={!exercises.length}
        value={selectedExerciseId}
        options={options}
        onChange={onSelect}
        aria-label="Exercise"
      />
      <Space wrap size="small" className="workout-toolbar__actions">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          disabled={!selectedExerciseId}
          onClick={onLogSession}
        >
          Log session
        </Button>
        <Button icon={<PlusOutlined />} onClick={onAddExercise}>
          Add exercise
        </Button>
        <Button
          icon={showAllExercises ? <UnorderedListOutlined /> : <AppstoreOutlined />}
          disabled={!exercises.length || !onToggleAllExercises}
          onClick={onToggleAllExercises}
        >
          {showAllExercises ? "Sessions" : "Training grid"}
        </Button>
        <Button
          icon={<EditOutlined />}
          disabled={!selectedExerciseId}
          onClick={onEditExercise}
        >
          Edit exercise
        </Button>
        <Button
          icon={<DownloadOutlined />}
          disabled={!canExport}
          onClick={onExportCsv}
        >
          Export CSV
        </Button>
        <span className="workout-toolbar__keys" aria-hidden>
          <kbd>N</kbd> log · <kbd>/</kbd> search
        </span>
      </Space>
    </div>
  );
}
