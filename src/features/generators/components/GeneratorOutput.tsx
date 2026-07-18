import { Input } from "antd";

type Props = {
  value: string;
  multiline?: boolean;
};

export default function GeneratorOutput({ value, multiline }: Props) {
  if (multiline) {
    return (
      <Input.TextArea
        aria-label="Generated value"
        className="generator-output"
        value={value}
        readOnly
        autoSize={false}
        rows={6}
      />
    );
  }
  return <Input aria-label="Generated value" className="generator-output" value={value} readOnly />;
}
