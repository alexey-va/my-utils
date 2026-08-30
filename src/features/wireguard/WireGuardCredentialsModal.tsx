import { CopyOutlined, DownloadOutlined } from "@ant-design/icons";
import { Button, Modal, message } from "antd";
import { QRCodeSVG } from "qrcode.react";
import type { WireGuardPeerCredentials } from "./types";

type Props = {
  open: boolean;
  credentials: WireGuardPeerCredentials | null;
  onClose: () => void;
};

export default function WireGuardCredentialsModal({ open, credentials, onClose }: Props) {
  const copy = async () => {
    if (!credentials) return;
    try {
      await navigator.clipboard.writeText(credentials.clientConfig);
      message.success("Конфиг скопирован");
    } catch {
      message.error("Не удалось скопировать конфиг");
    }
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
    <Modal
      open={open}
      title="Конфигурация WireGuard"
      onCancel={onClose}
      footer={null}
      width={640}
      className="wireguard-credentials-modal"
      destroyOnHidden
    >
      {credentials ? (
        <div className="wireguard-credentials">
          <div className="wireguard-credentials__qr" data-testid="wireguard-qr">
            <QRCodeSVG value={credentials.clientConfig} size={196} level="M" />
            <span>Сканируй в приложении WireGuard</span>
          </div>
          <div className="wireguard-credentials__details">
            <header>
              <strong>{credentials.peer.name}</strong>
              <code>{credentials.peer.assignedIp}</code>
            </header>
            <p>Готовый профиль для этого устройства. Он содержит приватный ключ — не пересылай его.</p>
            <div className="wireguard-credentials__actions">
              <Button type="primary" icon={<DownloadOutlined />} onClick={download}>Скачать конфиг</Button>
              <Button icon={<CopyOutlined />} onClick={() => void copy()}>Копировать</Button>
            </div>
            <details className="wireguard-credentials__config">
              <summary>Текст конфигурации</summary>
              <pre>{credentials.clientConfig}</pre>
            </details>
            <small>{credentials.fileName}</small>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
