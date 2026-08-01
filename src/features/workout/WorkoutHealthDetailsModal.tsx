import type { ReactNode } from "react";
import { Modal } from "antd";
import { useWorkoutLocale } from "./workoutLocale";

export type WorkoutHealthDetailsRow = {
  date: string;
  value: string;
};

type Props = {
  open: boolean;
  title: string;
  valueLabel: string;
  rows: WorkoutHealthDetailsRow[];
  controls: ReactNode;
  chart: ReactNode;
  onClose: () => void;
};

export function WorkoutHealthDetailsModal({
  open,
  title,
  valueLabel,
  rows,
  controls,
  chart,
  onClose,
}: Props) {
  const { formatDate, t } = useWorkoutLocale();
  const newestFirst = [...rows].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <Modal
      open={open}
      title={title}
      onCancel={onClose}
      footer={null}
      width={1040}
      centered
      destroyOnHidden
      className="workout-health-details"
    >
      <p className="workout-health-details__hint">{t("health.detailsHint")}</p>
      <div className="workout-health-details__controls">{controls}</div>
      <div className="workout-health-details__chart">{chart}</div>
      <div className="workout-health-details__table-wrap">
        <table className="workout-health-details__table">
          <thead>
            <tr>
              <th scope="col">{t("common.date")}</th>
              <th scope="col">{valueLabel}</th>
            </tr>
          </thead>
          <tbody>
            {newestFirst.map((row) => (
              <tr key={row.date}>
                <td>{formatDate(row.date)}</td>
                <td>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
