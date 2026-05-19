import { Input } from "antd";

type Props = {
  value: string;
  multiline?: boolean;
};

export default function GeneratorOutput({ value, multiline }: Props) {
  if (multiline) {
    return (
      <Input.TextArea
        className="generator-output"
        value={value}
        readOnly
        autoSize={false}
        rows={6}
      />
    );
  }
  return <Input className="generator-output" value={value} readOnly />;
}
