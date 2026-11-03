import { useEffect, useState } from "react";
import { Alert, Button, Drawer, Form, Input, Popconfirm } from "antd";
import { BankOutlined, ReloadOutlined } from "@ant-design/icons";
import { ApiError } from "../../api/errors";
import { connectBusinessBank, disconnectBusinessBank, syncBusinessBank } from "./api";
import { formatDate, localToday, monthBounds } from "./format";
import type { BusinessBank } from "./types";

export default function BankDrawer({ open, bank, period, onClose, onChanged }: { open: boolean; bank: BusinessBank; period: string; onClose: () => void; onChanged: () => void }) {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState<"connect" | "sync" | "disconnect" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  useEffect(() => {
    if (!open) { setToken(""); return; }
    const bounds = monthBounds(period === "all" ? localToday().slice(0, 7) : period);
    setFrom(bounds.from); setTo(bounds.to); setError(""); setNotice("");
  }, [open, period]);
  async function run(action: "connect" | "sync" | "disconnect") {
    setBusy(action); setError(""); setNotice("");
    const secret = token.trim();
    if (action === "connect") setToken("");
    try {
      if (action === "connect") await connectBusinessBank(secret);
      else if (action === "disconnect") await disconnectBusinessBank();
      else await syncBusinessBank(from, to);
      setNotice(action === "connect" ? "Банк подключён. Теперь загрузите поступления за нужный период." : action === "disconnect" ? "Подключение удалено. История документов и платежей сохранена." : "Поступления обновлены. Неоднозначные платежи доступны во вкладке «Поступления».");
      onChanged();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Не удалось связаться с банком. Проверьте соединение и повторите запрос.");
    } finally { setBusy(null); }
  }
  return <Drawer open={open} title="Сверка с Точкой" width={540} rootClassName="business-drawer" onClose={busy ? undefined : onClose} closable={!busy} maskClosable={!busy} keyboard={!busy} destroyOnHidden>
    <div className="business-bank-heading"><BankOutlined /><div><strong>{bank.connected ? "Банк подключён" : bank.lastSyncedAt ? "Подключить для обновления" : "Подключение банка"}</strong><p>{bank.accountCount ? `Счетов в Точке: ${bank.accountCount}` : "Выписки помогут найти оплаты по вашим счетам"}</p></div></div>
    {!bank.connected && bank.lastSyncedAt && <div className="business-imported-bank"><p className="business-intro">Загруженные выписки и зачтённые оплаты доступны без подключения. Токен нужен для новых запросов к банку.</p><dl className="business-details"><div><dt>Выписки загружены</dt><dd>{formatDate(bank.lastSyncedAt)}</dd></div><div><dt>Покрытие выпиской</dt><dd>{bank.coverageStart && bank.coverageEnd ? `${formatDate(bank.coverageStart)} — ${formatDate(bank.coverageEnd)}` : "Пока не подтверждено"}</dd></div></dl></div>}
    {error && <Alert showIcon type="error" message={error} className="business-form-alert" />}
    {notice && <Alert showIcon type="success" message={notice} className="business-form-alert" />}
    {!bank.connected ? <Form layout="vertical" onFinish={() => run("connect")}><p className="business-intro">Введите API-токен Точки с доступом к счетам и выпискам. Для создания счетов в банке также нужно разрешение на документы.</p><Form.Item label="API-токен" required extra="Токен хранится на сервере в зашифрованном виде. В браузере он не сохраняется."><Input.Password aria-label="API-токен" value={token} onChange={event => setToken(event.target.value)} autoComplete="off" spellCheck={false} placeholder="Вставьте токен" /></Form.Item><Button type="primary" htmlType="submit" loading={busy === "connect"} disabled={!token.trim()}>Подключить Точку</Button></Form> : <>
      <dl className="business-details"><div><dt>Последняя синхронизация</dt><dd>{bank.lastSyncedAt ? formatDate(bank.lastSyncedAt) : "Ещё не было"}</dd></div><div><dt>Покрытие выпиской</dt><dd>{bank.coverageStart && bank.coverageEnd ? `${formatDate(bank.coverageStart)} — ${formatDate(bank.coverageEnd)}` : "Пока не подтверждено"}</dd></div></dl>
      {bank.error && <Alert showIcon type="warning" message="Последняя синхронизация не завершилась" description={bank.error} className="business-form-alert" />}
      <h3 className="business-section-heading">Загрузить поступления</h3><p className="business-intro">Проверим входящие платежи по рублёвым счетам. Повторная загрузка не создаёт дубли.</p>
      <Form layout="vertical" onFinish={() => run("sync")}><div className="business-form-grid"><Form.Item label="С даты" required><Input type="date" aria-label="С даты" value={from} onChange={event => setFrom(event.target.value)} max={to || undefined} /></Form.Item><Form.Item label="По дату" required><Input type="date" aria-label="По дату" value={to} onChange={event => setTo(event.target.value)} min={from || undefined} /></Form.Item></div><Button type="primary" icon={<ReloadOutlined />} htmlType="submit" loading={busy === "sync"} disabled={!!busy || !from || !to || from > to}>Синхронизировать</Button></Form>
      <div className="business-disconnect"><p>Отключение удалит сохранённый токен. Документы и загруженные платежи останутся.</p><Popconfirm title="Отключить Точку?" description="История документов и платежей сохранится." okText="Отключить" cancelText="Отмена" onConfirm={() => run("disconnect")}><Button danger loading={busy === "disconnect"} disabled={!!busy}>Отключить банк</Button></Popconfirm></div>
    </>}
  </Drawer>;
}
