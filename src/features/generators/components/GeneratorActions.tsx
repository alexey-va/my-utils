import { Space, Button } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import CopyButton from "../../../shared/components/CopyButton";

type Props = {
  value: string;
  onGenerate: () => void;
};

export default function GeneratorActions({ value, onGenerate }: Props) {
  return (
    <Space>
      <Button type="primary" icon={<ReloadOutlined />} onClick={onGenerate}>
        Generate
      </Button>
      <CopyButton value={value} />
    </Space>
  );
}
