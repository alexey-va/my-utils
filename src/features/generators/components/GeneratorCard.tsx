import { Card } from "antd";
import type { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
};

export default function GeneratorCard({ title, children, footer }: Props) {
  return (
    <Card title={title} className="generator-card" variant="borderless">
      <div className="generator-card__body">{children}</div>
      {footer && <div className="generator-card__footer">{footer}</div>}
    </Card>
  );
}
