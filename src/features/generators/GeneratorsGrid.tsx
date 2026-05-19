import type { ReactNode } from "react";

type Props = {
  uuid: ReactNode;
  password: ReactNode;
  number: ReactNode;
};

export default function GeneratorsGrid({ uuid, password, number }: Props) {
  return (
    <div className="generators-grid">
      <div className="generators-grid__item generators-grid__uuid">{uuid}</div>
      <div className="generators-grid__item generators-grid__password">{password}</div>
      <div className="generators-grid__item generators-grid__number">{number}</div>
    </div>
  );
}
