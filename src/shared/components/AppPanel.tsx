import { Card } from "antd";
import type { ReactNode } from "react";

type Props = {
  title?: string;
  children: ReactNode;
  className?: string;
};

/** Standard content panel (Admin, JSON tool, etc.). */
export default function AppPanel({ title, children, className }: Props) {
  return (
    <Card title={title} className={className ? `app-panel ${className}` : "app-panel"} bordered={false}>
      {children}
    </Card>
  );
}
