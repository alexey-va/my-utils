import { Card } from "antd";

export const panelStyle = {
  background: "#181d29",
  border: "1px solid #2a3142",
  height: "100%",
} as const;

export default function GeneratorCard({
  title,
  children,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card title={title} style={panelStyle}>
      {/* make the card body a flex column that can stretch */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, minHeight: 0 }}>
        {children}
      </div>
    </Card>
  );
}
