import { useState } from "react";
import { Button } from "antd";
import { CopyOutlined, CheckOutlined } from "@ant-design/icons";

export default function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const doCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <Button
      type={copied ? "primary" : "default"}
      icon={copied ? <CheckOutlined /> : <CopyOutlined />}
      onClick={doCopy}
      style={{ transition: "all .25s ease", minWidth: copied ? 100 : 40 }}
    >
      {copied ? "Copied!" : ""}
    </Button>
  );
}
