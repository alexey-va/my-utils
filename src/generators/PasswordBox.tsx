import { Input, InputNumber, Checkbox, Space, Button } from "antd";
import GeneratorCard from "../components/GeneratorCard";
import TitleDrag from "../components/TitleDrag";
import CopyButton from "../components/CopyButton";
import { useEffect, useState } from "react";
import { ReloadOutlined } from "@ant-design/icons";
import { randPassword } from "../utils/random";

export default function PasswordBox() {
  const [len, setLen] = useState<number>(16);
  const [digits, setDigits] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [similar, setSimilar] = useState(false);
  const [v, setV] = useState(randPassword(len, { digits, symbols, similar }));

  useEffect(() => {
    setV(randPassword(len, { digits, symbols, similar }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [len, digits, symbols, similar]);

  return (
    <GeneratorCard title={<TitleDrag text="Password" />}>
      <Input value={v} readOnly />

      <div style={{ marginTop: "auto" }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span>Length</span>
          <InputNumber min={6} max={64} value={len} onChange={(n) => setLen(Number(n))} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Checkbox checked={digits} onChange={(e) => setDigits(e.target.checked)}>Digits</Checkbox>
          <Checkbox checked={symbols} onChange={(e) => setSymbols(e.target.checked)}>Symbols</Checkbox>
          <Checkbox checked={similar} onChange={(e) => setSimilar(e.target.checked)}>Similar chars</Checkbox>
        </div>
        <Space>
          <Button type="primary" icon={<ReloadOutlined />} onClick={() => setV(randPassword(len, { digits, symbols, similar }))}>Generate</Button>
          <CopyButton value={v} />
        </Space>
      </div>
    </GeneratorCard>
  );
}
