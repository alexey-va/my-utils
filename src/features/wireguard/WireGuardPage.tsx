import {
  DeleteOutlined,
  EllipsisOutlined,
  KeyOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { Button, Dropdown, Empty, Form, Input, Modal, Typography, message } from "antd";
import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../../api/errors";
import PageLayout from "../../shared/components/PageLayout";
import {
  createWireGuardPeer,
  createWireGuardRelay,
  deleteWireGuardPeer,
  deleteWireGuardRelay,
  fetchWireGuardPeerCredentials,
  fetchWireGuardPeers,
  fetchWireGuardRelays,
  rotateWireGuardAgentToken,
  setWireGuardPeerEnabled,
} from "./api";
import type { CreateWireGuardRelay, WireGuardPeer, WireGuardPeerCredentials, WireGuardRelay } from "./types";
import WireGuardCredentialsModal from "./WireGuardCredentialsModal";
import WireGuardPeerMetricsDrawer from "./WireGuardPeerMetricsDrawer";
import "./wireguard.css";

const POLL_INTERVAL_MS = 15_000;
const ONLINE_WINDOW_MS = 3 * 60_000;

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error.message : fallback;

function bytes(value: number): string {
  if (value < 1024) return `${value} B`;
  const units = ["KiB", "MiB", "GiB", "TiB"];
  let amount = value / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && amount >= 1024; index += 1) {
    amount /= 1024;
    unit = units[index];
  }
  return `${amount.toFixed(amount >= 10 ? 1 : 2)} ${unit}`;
}

function date(value: string | null): string {
  return value ? new Date(value).toLocaleString("ru-RU") : "—";
}

function relativeTime(value: string | null): string {
  if (!value) return "данных ещё нет";
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 10) return "только что";
  if (seconds < 60) return `${seconds} сек. назад`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} мин. назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч. назад`;
  return date(value);
}

function peerPresence(peer: WireGuardPeer): { label: string; tone: string } {
  if (!peer.enabled) return { label: "Отключён", tone: "disabled" };
  if (!peer.latestHandshakeAt) return { label: "Не подключался", tone: "idle" };
  if (Date.now() - new Date(peer.latestHandshakeAt).getTime() <= ONLINE_WINDOW_MS) {
    return { label: "Онлайн", tone: "online" };
  }
  return { label: `Был в сети ${relativeTime(peer.latestHandshakeAt)}`, tone: "idle" };
}

function relayHealth(relay: WireGuardRelay): { label: string; tone: string } {
  switch (relay.status) {
    case "READY": return { label: "Работает", tone: "online" };
    case "SYNCING": return { label: "Синхронизация", tone: "syncing" };
    case "STALE": return { label: "Агент не отвечает", tone: "error" };
    default: return { label: "Ждёт агента", tone: "idle" };
  }
}

export default function WireGuardPage() {
  const [relays, setRelays] = useState<WireGuardRelay[]>([]);
  const [peers, setPeers] = useState<WireGuardPeer[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createRelayOpen, setCreateRelayOpen] = useState(false);
  const [createPeerOpen, setCreatePeerOpen] = useState(false);
  const [peerName, setPeerName] = useState("");
  const [credentials, setCredentials] = useState<WireGuardPeerCredentials | null>(null);
  const [metricsPeer, setMetricsPeer] = useState<WireGuardPeer | null>(null);
  const [agentToken, setAgentToken] = useState<string | null>(null);
  const [relayForm] = Form.useForm<CreateWireGuardRelay>();
  const [modal, modalContext] = Modal.useModal();
  const selected = relays[0] ?? null;

  const loadSnapshot = useCallback(async (background = false) => {
    if (background) setRefreshing(true);
    try {
      const nextRelays = await fetchWireGuardRelays();
      const nextRelay = nextRelays[0] ?? null;
      const nextPeers = nextRelay ? await fetchWireGuardPeers(nextRelay.id) : [];
      setRelays(nextRelays);
      setPeers(nextPeers);
    } catch (error) {
      message.error(errorMessage(error, "Не удалось обновить VPN"));
    } finally {
      setInitialLoading(false);
      if (background) setRefreshing(false);
    }
  }, []);

  useEffect(() => { void loadSnapshot(); }, [loadSnapshot]);

  useEffect(() => {
    const poll = () => {
      if (document.visibilityState === "visible") void loadSnapshot(true);
    };
    const interval = window.setInterval(poll, POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", poll);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [loadSnapshot]);

  const createRelay = async (values: CreateWireGuardRelay) => {
    try {
      const created = await createWireGuardRelay(values);
      setCreateRelayOpen(false);
      setAgentToken(created.agentToken);
      relayForm.resetFields();
      await loadSnapshot(true);
    } catch (error) {
      message.error(errorMessage(error, "Не удалось создать relay"));
    }
  };

  const createPeer = async () => {
    if (!selected || !peerName.trim()) return;
    try {
      const created = await createWireGuardPeer(selected.id, peerName.trim());
      setPeerName("");
      setCreatePeerOpen(false);
      setCredentials(created);
      await loadSnapshot(true);
    } catch (error) {
      message.error(errorMessage(error, "Не удалось добавить устройство"));
    }
  };

  const showCredentials = async (peer: WireGuardPeer) => {
    if (!selected) return;
    try {
      setCredentials(await fetchWireGuardPeerCredentials(selected.id, peer.id));
    } catch (error) {
      message.error(errorMessage(error, "Не удалось получить конфиг"));
    }
  };

  const setPeerEnabled = async (peer: WireGuardPeer, enabled: boolean) => {
    if (!selected) return;
    try {
      const updated = await setWireGuardPeerEnabled(selected.id, peer.id, enabled);
      setPeers((items) => items.map((item) => item.id === updated.id ? updated : item));
      void loadSnapshot(true);
    } catch (error) {
      message.error(errorMessage(error, "Не удалось изменить устройство"));
    }
  };

  const confirmDeletePeer = (peer: WireGuardPeer) => {
    if (!selected) return;
    modal.confirm({
      title: `Удалить ${peer.name}?`,
      content: "Устройство потеряет доступ, а его адрес освободится.",
      okText: "Удалить",
      okButtonProps: { danger: true },
      cancelText: "Отмена",
      onOk: async () => {
        try {
          await deleteWireGuardPeer(selected.id, peer.id);
          await loadSnapshot(true);
        } catch (error) {
          message.error(errorMessage(error, "Не удалось удалить устройство"));
          throw error;
        }
      },
    });
  };

  const actions = (
    <>
      <Button
        aria-label="Обновить данные"
        title="Обновить данные"
        icon={<ReloadOutlined />}
        loading={refreshing}
        onClick={() => void loadSnapshot(true)}
      />
      <Button
        type="primary"
        icon={<PlusOutlined />}
        aria-label="Добавить устройство"
        disabled={!selected || selected.status === "WAITING_FOR_AGENT"}
        onClick={() => setCreatePeerOpen(true)}
      >
        Добавить устройство
      </Button>
    </>
  );

  return (
    <PageLayout title="VPN" subtitle="WireGuard на utils · защищённый выход через Veesp" actions={actions}>
      {modalContext}
      <section className="wireguard-page" aria-label="Состояние VPN">
        {initialLoading ? (
          <div className="wireguard-loading-shell" aria-busy="true" aria-label="Загрузка VPN">
            <span className="wireguard-loading-line wireguard-loading-line--status" />
            <span className="wireguard-loading-line wireguard-loading-line--peer" />
          </div>
        ) : selected ? (
          <>
            <header className="wireguard-status-strip">
              {(() => {
                const health = relayHealth(selected);
                return (
                  <span className={`wireguard-status wireguard-status--${health.tone}`}>
                    <i aria-hidden="true" /> {health.label}
                  </span>
                );
              })()}
              <span className={selected.routingMode === "RU_DIRECT_AWG_DEFAULT" ? "wireguard-route wireguard-route--direct" : "wireguard-route wireguard-route--pending"}>
                RU → {selected.routingMode === "RU_DIRECT_AWG_DEFAULT" ? "напрямую" : "через Veesp"}
              </span>
              <span className="wireguard-route">Остальное → Veesp</span>
              <span className="wireguard-updated">Обновлено {relativeTime(selected.lastSeenAt)}</span>
            </header>

            <div className="wireguard-peer-list" role="list" aria-label="Устройства">
              {peers.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Устройств пока нет" />
              ) : peers.map((peer) => {
                const presence = peerPresence(peer);
                const download = bytes(peer.totalTransmitBytes);
                const upload = bytes(peer.totalReceiveBytes);
                return (
                  <article className="wireguard-peer" role="listitem" key={peer.id}>
                    <div className="wireguard-peer__identity">
                      <strong>{peer.name}</strong>
                      <code>{peer.assignedIp}</code>
                    </div>
                    <span className={`wireguard-status wireguard-status--${presence.tone}`}>
                      <i aria-hidden="true" /> {presence.label}
                    </span>
                    <div className="wireguard-peer__traffic">
                      <span
                        className="wireguard-traffic wireguard-traffic--download"
                        aria-label={`Скачано ${download}`}
                      >
                        <b aria-hidden="true">↓</b> {download}
                      </span>
                      <span
                        className="wireguard-traffic wireguard-traffic--upload"
                        aria-label={`Отдано ${upload}`}
                      >
                        <b aria-hidden="true">↑</b> {upload}
                      </span>
                    </div>
                    <div className="wireguard-peer__actions">
                      <Button type="text" onClick={() => setMetricsPeer(peer)} aria-label={`График ${peer.name}`}>
                        График
                      </Button>
                      <Dropdown
                        trigger={["click"]}
                        menu={{
                          items: [
                            { key: "config", icon: <KeyOutlined />, label: "Показать конфиг" },
                            { key: "enabled", label: peer.enabled ? "Отключить" : "Включить" },
                            { type: "divider" },
                            { key: "delete", icon: <DeleteOutlined />, label: "Удалить", danger: true },
                          ],
                          onClick: ({ key }) => {
                            if (key === "config") void showCredentials(peer);
                            if (key === "enabled") void setPeerEnabled(peer, !peer.enabled);
                            if (key === "delete") confirmDeletePeer(peer);
                          },
                        }}
                      >
                        <Button type="text" icon={<EllipsisOutlined />} aria-label={`Действия ${peer.name}`} />
                      </Dropdown>
                    </div>
                  </article>
                );
              })}
            </div>

            <details className="wireguard-infrastructure">
              <summary>Инфраструктура</summary>
              <dl>
                <div><dt>Публичный адрес VPN</dt><dd><code>{selected.publicEndpoint}</code></dd></div>
                <div><dt>Адресная сеть устройств (CIDR)</dt><dd><code>{selected.clientCidr}</code></dd></div>
                <div><dt>DNS устройств</dt><dd><code>{selected.clientDns}</code></dd></div>
                <div><dt>Ревизия агента</dt><dd>{selected.appliedRevision ?? "—"} / {selected.desiredRevision}</dd></div>
                <div><dt>Heartbeat</dt><dd>{date(selected.lastSeenAt)}</dd></div>
                <div><dt>RU-префиксов</dt><dd>{selected.ruPrefixCount.toLocaleString("ru-RU")}</dd></div>
                <div><dt>Server key</dt><dd>{selected.serverPublicKey ? <Typography.Text copyable code>{selected.serverPublicKey}</Typography.Text> : "—"}</dd></div>
              </dl>
              <div className="wireguard-infrastructure__actions">
                <Button onClick={async () => {
                  try { setAgentToken((await rotateWireGuardAgentToken(selected.id)).agentToken); }
                  catch (error) { message.error(errorMessage(error, "Не удалось сменить токен")); }
                }}>Сменить agent token</Button>
                <Button danger onClick={() => modal.confirm({
                  title: "Удалить relay?",
                  content: "Это возможно только после удаления всех устройств.",
                  okText: "Удалить",
                  okButtonProps: { danger: true },
                  cancelText: "Отмена",
                  onOk: async () => {
                    await deleteWireGuardRelay(selected.id);
                    await loadSnapshot(true);
                  },
                })}>Удалить relay</Button>
              </div>
            </details>
          </>
        ) : (
          <div className="wireguard-empty">
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="VPN ещё не настроен" />
            <Button type="primary" onClick={() => setCreateRelayOpen(true)}>Настроить relay</Button>
          </div>
        )}
      </section>

      <Modal
        open={createPeerOpen}
        title="Добавить устройство"
        okText="Создать и показать конфиг"
        cancelText="Отмена"
        okButtonProps={{ disabled: !peerName.trim() }}
        onOk={() => void createPeer()}
        onCancel={() => { setCreatePeerOpen(false); setPeerName(""); }}
        destroyOnHidden
      >
        <Input
          autoFocus
          value={peerName}
          maxLength={120}
          placeholder="Например, Телефон"
          onChange={(event) => setPeerName(event.target.value)}
          onPressEnter={() => void createPeer()}
        />
      </Modal>
      <Modal open={createRelayOpen} title="Настроить WireGuard relay" footer={null} onCancel={() => setCreateRelayOpen(false)}>
        <Form
          form={relayForm}
          layout="vertical"
          onFinish={(values) => void createRelay(values)}
          initialValues={{ name: "utils → veesp", publicEndpoint: "51.250.112.232:51820", clientCidr: "10.89.0.0/24", clientDns: "1.1.1.1" }}
        >
          <Form.Item name="name" label="Название" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="publicEndpoint" label="Публичный адрес VPN" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="clientCidr" label="Адресная сеть устройств (CIDR)" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="clientDns" label="DNS" rules={[{ required: true }]}><Input /></Form.Item>
          <Button type="primary" htmlType="submit">Создать</Button>
        </Form>
      </Modal>
      <Modal open={agentToken !== null} title="Одноразовый agent token" onCancel={() => setAgentToken(null)} onOk={() => setAgentToken(null)}>
        <Typography.Paragraph type="warning">Сохраните в root-only файл: после закрытия API его больше не покажет.</Typography.Paragraph>
        <Input.TextArea readOnly rows={3} value={agentToken ?? ""} />
      </Modal>
      <WireGuardCredentialsModal open={credentials !== null} credentials={credentials} onClose={() => setCredentials(null)} />
      <WireGuardPeerMetricsDrawer relayId={selected?.id ?? null} peer={metricsPeer} onClose={() => setMetricsPeer(null)} />
    </PageLayout>
  );
}
