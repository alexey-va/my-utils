import { CopyOutlined, DownloadOutlined, EyeInvisibleOutlined, EyeOutlined } from "@ant-design/icons";
import { Button, Input, Modal, Space, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { WireGuardPeerCredentials } from "./types";

type Props = {
  open: boolean;
  credentials: WireGuardPeerCredentials | null;
  onClose: () => void;
};

export default function WireGuardCredentialsModal({ open, credentials, onClose }: Props) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!open) setRevealed(false);
  }, [open]);

  const copy = async () => {
    if (!credentials) return;
    await navigator.clipboard.writeText(credentials.clientConfig);
    message.success("Конфиг скопирован");
  };

  const download = () => {
    if (!credentials) return;
    const url = URL.createObjectURL(new Blob(
      [credentials.clientConfig],
      { type: "application/x-wireguard-profile;charset=utf-8" },
    ));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = credentials.fileName;
    anchor.hidden = true;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  };

  return (
    <Modal open={open} title="WireGuard credentials" onCancel={onClose} footer={null} destroyOnHidden>
      {credentials ? (
        <div className="wireguard-credentials">
          <Typography.Text strong>{credentials.fileName}</Typography.Text>
          <div
            className={revealed ? "wireguard-credentials__qr" : "wireguard-credentials__qr wireguard-credentials__qr--masked"}
            data-testid="wireguard-qr"
            data-config={credentials.clientConfig}
          >
            <QRCodeSVG value={credentials.clientConfig} size={220} level="M" />
          </div>
          <Input.TextArea
            rows={10}
            readOnly
            spellCheck={false}
            value={revealed ? credentials.clientConfig : "••••••••\nПриватный ключ скрыт"}
            className="wireguard-credentials__config"
          />
          <Space wrap>
            <Button icon={revealed ? <EyeInvisibleOutlined /> : <EyeOutlined />} onClick={() => setRevealed((v) => !v)}>
              {revealed ? "Скрыть" : "Показать"}
            </Button>
            <Button icon={<CopyOutlined />} onClick={() => void copy()}>Копировать</Button>
            <Button type="primary" icon={<DownloadOutlined />} onClick={download}>Скачать .conf</Button>
          </Space>
        </div>
      ) : null}
    </Modal>
  );
}
