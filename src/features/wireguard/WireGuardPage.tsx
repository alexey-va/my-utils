import { DeleteOutlined, KeyOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, Descriptions, Empty, Form, Input, Modal, Popconfirm, Space, Switch, Table, Tag, Typography, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "../../api/errors";
import AppPanel from "../../shared/components/AppPanel";
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
import "./wireguard.css";

const statusLabels = {
  WAITING_FOR_AGENT: ["Ждёт агента", "default"],
  SYNCING: ["Синхронизация", "processing"],
  READY: ["Готов", "success"],
  STALE: ["Агент не отвечает", "error"],
} as const;

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

export default function WireGuardPage() {
  const [relays, setRelays] = useState<WireGuardRelay[]>([]);
  const [relayId, setRelayId] = useState<string | null>(null);
  const [peers, setPeers] = useState<WireGuardPeer[]>([]);
  const [loading, setLoading] = useState(true);
  const [createRelayOpen, setCreateRelayOpen] = useState(false);
  const [peerName, setPeerName] = useState("");
  const [credentials, setCredentials] = useState<WireGuardPeerCredentials | null>(null);
  const [agentToken, setAgentToken] = useState<string | null>(null);
  const [relayForm] = Form.useForm<CreateWireGuardRelay>();
  const selected = relays.find((relay) => relay.id === relayId) ?? null;

  const loadRelays = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchWireGuardRelays();
      setRelays(next);
      setRelayId((current) => current && next.some((item) => item.id === current) ? current : next[0]?.id ?? null);
    } catch (error) {
      message.error(errorMessage(error, "Не удалось загрузить relay"));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPeers = useCallback(async (id: string | null) => {
    if (!id) { setPeers([]); return; }
    try { setPeers(await fetchWireGuardPeers(id)); }
    catch (error) { message.error(errorMessage(error, "Не удалось загрузить пиры")); }
  }, []);

  useEffect(() => { void loadRelays(); }, [loadRelays]);
  useEffect(() => { void loadPeers(relayId); }, [loadPeers, relayId]);

  const columns = useMemo<ColumnsType<WireGuardPeer>>(() => [
    { title: "Пир", dataIndex: "name", render: (name, peer) => <Space direction="vertical" size={0}><Typography.Text strong>{name}</Typography.Text><Typography.Text type="secondary" code>{peer.assignedIp}</Typography.Text></Space> },
    { title: "Состояние", render: (_, peer) => <Switch checked={peer.enabled} onChange={async (enabled) => { if (!relayId) return; try { const updated = await setWireGuardPeerEnabled(relayId, peer.id, enabled); setPeers((items) => items.map((item) => item.id === updated.id ? updated : item)); await loadRelays(); } catch (error) { message.error(errorMessage(error, "Не удалось изменить пир")); } }} /> },
    { title: "Handshake", dataIndex: "latestHandshakeAt", render: date },
    { title: "Трафик", render: (_, peer) => `${bytes(peer.totalReceiveBytes)} ↓ · ${bytes(peer.totalTransmitBytes)} ↑` },
    { title: "Действия", render: (_, peer) => <Space><Button icon={<KeyOutlined />} onClick={async () => { if (!relayId) return; try { setCredentials(await fetchWireGuardPeerCredentials(relayId, peer.id)); } catch (error) { message.error(errorMessage(error, "Не удалось получить конфиг")); } }}>Конфиг</Button><Popconfirm title="Удалить пир и освободить адрес?" onConfirm={async () => { if (!relayId) return; try { await deleteWireGuardPeer(relayId, peer.id); await Promise.all([loadPeers(relayId), loadRelays()]); } catch (error) { message.error(errorMessage(error, "Не удалось удалить пир")); } }}><Button danger icon={<DeleteOutlined />} /></Popconfirm></Space> },
  ], [loadPeers, loadRelays, relayId]);

  const createRelay = async (values: CreateWireGuardRelay) => {
    try {
      const created = await createWireGuardRelay(values);
      setCreateRelayOpen(false); setAgentToken(created.agentToken); relayForm.resetFields();
      await loadRelays(); setRelayId(created.id);
    } catch (error) { message.error(errorMessage(error, "Не удалось создать relay")); }
  };

  const createPeer = async () => {
    if (!relayId || !peerName.trim()) return;
    try { const created = await createWireGuardPeer(relayId, peerName.trim()); setPeerName(""); setCredentials(created); await Promise.all([loadPeers(relayId), loadRelays()]); }
    catch (error) { message.error(errorMessage(error, "Не удалось создать пир")); }
  };

  return (
    <PageLayout title="WireGuard" subtitle="Клиенты входят на utils и выходят через AmneziaWG на Veesp" actions={<><Button aria-label="Обновить relays" title="Обновить relays" icon={<ReloadOutlined />} loading={loading} onClick={() => void loadRelays()} /><Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateRelayOpen(true)}>Новый relay</Button></>}>
      <div className="wireguard-page">
        {relays.length ? <div className="wireguard-relay-tabs">{relays.map((relay) => { const [label, color] = statusLabels[relay.status]; return <Button key={relay.id} type={relay.id === relayId ? "primary" : "default"} onClick={() => setRelayId(relay.id)}>{relay.name} <Tag color={color}>{label}</Tag></Button>; })}</div> : null}
        {selected ? <AppPanel title={selected.name}><Descriptions column={{ xs: 1, md: 2 }} size="small" items={[{ key: "endpoint", label: "Endpoint", children: selected.publicEndpoint }, { key: "cidr", label: "Client CIDR", children: selected.clientCidr }, { key: "revision", label: "Ревизия", children: `${selected.appliedRevision ?? "—"} / ${selected.desiredRevision}` }, { key: "seen", label: "Heartbeat", children: date(selected.lastSeenAt) }, { key: "key", label: "Server key", children: selected.serverPublicKey ? <Typography.Text copyable code>{selected.serverPublicKey}</Typography.Text> : "—" }]} /><Space wrap className="wireguard-relay-actions"><Button onClick={async () => { try { setAgentToken((await rotateWireGuardAgentToken(selected.id)).agentToken); } catch (error) { message.error(errorMessage(error, "Не удалось сменить токен")); } }}>Сменить agent token</Button><Popconfirm title="Удалить пустой relay?" onConfirm={async () => { try { await deleteWireGuardRelay(selected.id); await loadRelays(); } catch (error) { message.error(errorMessage(error, "Не удалось удалить relay")); } }}><Button danger>Удалить relay</Button></Popconfirm></Space></AppPanel> : <AppPanel><Empty description="Relay ещё не создан" /></AppPanel>}
        {selected ? <AppPanel title="Клиентские пиры"><Space.Compact className="wireguard-peer-create"><Input value={peerName} maxLength={120} placeholder="Название устройства" onChange={(event) => setPeerName(event.target.value)} onPressEnter={() => void createPeer()} /><Button type="primary" disabled={selected.status === "WAITING_FOR_AGENT"} onClick={() => void createPeer()}>Создать и показать конфиг</Button></Space.Compact><Table rowKey="id" columns={columns} dataSource={peers} pagination={false} scroll={{ x: 860 }} /></AppPanel> : null}
      </div>
      <Modal open={createRelayOpen} title="Новый WireGuard relay" footer={null} onCancel={() => setCreateRelayOpen(false)}><Form form={relayForm} layout="vertical" onFinish={(values) => void createRelay(values)} initialValues={{ name: "utils → veesp", publicEndpoint: "51.250.112.232:51820", clientCidr: "10.89.0.0/24", clientDns: "1.1.1.1" }}><Form.Item name="name" label="Название" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="publicEndpoint" label="Публичный endpoint" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="clientCidr" label="Client CIDR" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="clientDns" label="DNS" rules={[{ required: true }]}><Input /></Form.Item><Button type="primary" htmlType="submit">Создать</Button></Form></Modal>
      <Modal open={agentToken !== null} title="Одноразовый agent token" onCancel={() => setAgentToken(null)} onOk={() => setAgentToken(null)}><Typography.Paragraph type="warning">Сохраните в root-only файл: после закрытия API его больше не покажет.</Typography.Paragraph><Input.TextArea readOnly rows={3} value={agentToken ?? ""} /></Modal>
      <WireGuardCredentialsModal open={credentials !== null} credentials={credentials} onClose={() => setCredentials(null)} />
    </PageLayout>
  );
}
