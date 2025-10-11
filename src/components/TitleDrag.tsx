import { HolderOutlined } from "@ant-design/icons";

export default function TitleDrag({ text }: { text: string }) {
  return (
    <div className="drag-handle" style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <HolderOutlined />
      <span>{text}</span>
    </div>
  );
}
