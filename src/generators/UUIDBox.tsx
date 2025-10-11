import { useState } from "react";
import { Input, Space, Button } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import GeneratorCard from "../components/GeneratorCard";
import TitleDrag from "../components/TitleDrag";
import CopyButton from "../components/CopyButton";

export default function UUIDBox() {
  const [v, setV] = useState(crypto.randomUUID());

  return (
    <GeneratorCard title={<TitleDrag text="UUID v4" />}>
      <Input value={v} readOnly />

      <div style={{ marginTop: "auto" }} />

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Space>
          <Button type="primary" icon={<ReloadOutlined />} onClick={() => setV(crypto.randomUUID())}>
            Generate
          </Button>
          <CopyButton value={v} />
        </Space>
      </div>
    </GeneratorCard>
  );
}
