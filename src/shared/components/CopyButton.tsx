import { useEffect, useState } from "react";
import { Button } from "antd";
import { CopyOutlined, CheckOutlined } from "@ant-design/icons";

export default function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [value]);

  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Button
      aria-label={copied ? "Copied to clipboard" : "Copy to clipboard"}
      className="copy-button"
      type={copied ? "primary" : "default"}
      icon={copied ? <CheckOutlined /> : <CopyOutlined />}
      onClick={doCopy}
    >
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}
