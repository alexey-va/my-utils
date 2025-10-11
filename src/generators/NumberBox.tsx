import { Input, InputNumber, Space, Button } from "antd";
import GeneratorCard from "../components/GeneratorCard";
import TitleDrag from "../components/TitleDrag";
import CopyButton from "../components/CopyButton";
import { useState } from "react";
import { ReloadOutlined } from "@ant-design/icons";

export default function NumberBox() {
  const [min, setMin] = useState<number>(1);
  const [max, setMax] = useState<number>(100);
  const genVal = () => {
    const lo = Math.min(min, max), hi = Math.max(min, max);
    return Math.floor(lo + Math.random() * (hi - lo + 1));
  };
  const [v, setV] = useState(String(genVal()));

  return (
    <GeneratorCard title={<TitleDrag text="Random Number" />}>
      <Input value={v} readOnly />

      <div style={{ marginTop: "auto" }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span>Min</span><InputNumber value={min} onChange={(n) => setMin(Number(n))} />
          <span>Max</span><InputNumber value={max} onChange={(n) => setMax(Number(n))} />
        </div>
        <Space>
          <Button type="primary" icon={<ReloadOutlined />} onClick={() => setV(String(genVal()))}>Generate</Button>
          <CopyButton value={v} />
        </Space>
      </div>
    </GeneratorCard>
  );
}
