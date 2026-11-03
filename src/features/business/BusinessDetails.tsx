import { useEffect, useState } from "react";
import { Alert, Button, Drawer, Empty, Form, Input, Popconfirm, Select, Skeleton, message } from "antd";
import { ApiError } from "../../api/errors";
import { allocateBusinessPayment, fetchBusinessWorkspace, reverseBusinessAllocation } from "./api";
import { DocumentButton } from "./BusinessLedgers";
import { InvoiceStatusLabel } from "./BusinessOverview";
import { formatAmountInput, formatDate, formatMoney, formatPeriod, parseMoneyMinor } from "./format";
import type { BusinessAllocation, BusinessInvoiceView, BusinessPaymentView, BusinessWorkspace } from "./types";

function useDetailWorkspace(open: boolean) {
  const [workspace, setWorkspace] = useState<BusinessWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true); setError("");
    fetchBusinessWorkspace("all", undefined, controller.signal).then(data => { if (!controller.signal.aborted) setWorkspace(data); }).catch(() => { if (!controller.signal.aborted) setError("Не удалось загрузить историю. Повторите запрос."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open, revision]);
  return { workspace, loading, error, reload: () => setRevision(value => value + 1) };
}

function AllocationForm({ workspace, invoiceId, paymentId, onChanged }: { workspace: BusinessWorkspace; invoiceId?: string; paymentId?: string; onChanged: () => void }) {
  const [selectedInvoice, setSelectedInvoice] = useState(invoiceId ?? "");
  const [selectedPayment, setSelectedPayment] = useState(paymentId ?? "");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [messageApi, context] = message.useMessage();
  const invoice = workspace.invoices.find(item => item.id === selectedInvoice);
  const payment = workspace.payments.find(item => item.id === selectedPayment);
  const limit = Math.min(invoice?.outstandingMinor ?? 0, payment?.unallocatedMinor ?? 0);
  const validInvoices = workspace.invoices.filter(item => item.isCurrent && item.outstandingMinor > 0);
  const validPayments = workspace.payments.filter(item => item.unallocatedMinor > 0);
  const names = new Map(workspace.counterparties.map(item => [item.id, item.name]));
  async function allocate() {
    const minor = parseMoneyMinor(amount);
    if (!invoice || !payment || minor === null || minor <= 0 || minor > limit) { setError("Выберите счёт и платёж. Сумма должна быть больше нуля и не превышать доступный остаток."); return; }
    setSaving(true); setError("");
    try { await allocateBusinessPayment(invoice.id, payment.id, minor); setAmount(""); messageApi.success("Оплата зачтена по счёту"); onChanged(); }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : "Не удалось зачесть оплату. Попробуйте ещё раз."); }
    finally { setSaving(false); }
  }
  return <div className="business-allocation-form">{context}<h3 className="business-section-heading">Зачесть оплату</h3><p className="business-intro">Проверьте плательщика, номер счёта и назначение. Можно зачесть часть платежа.</p>
    {error && <Alert type="error" showIcon message={error} className="business-form-alert" />}
    <Form layout="vertical" onFinish={allocate} disabled={saving}>
      {!invoiceId && <Form.Item label="Счёт" required><Select aria-label="Счёт для оплаты" showSearch optionFilterProp="label" value={selectedInvoice || undefined} placeholder="Выберите счёт" onChange={value => { setSelectedInvoice(value); setAmount(""); }} options={validInvoices.map(item => ({ value: item.id, label: `№ ${item.number} · ${names.get(item.counterpartyId)} · ${formatPeriod(item.period)} · ${formatMoney(item.outstandingMinor)}` }))} /></Form.Item>}
      {!paymentId && <Form.Item label="Поступление" required><Select aria-label="Поступление для счёта" showSearch optionFilterProp="label" value={selectedPayment || undefined} placeholder="Выберите поступление" onChange={value => { setSelectedPayment(value); setAmount(""); }} options={validPayments.map(item => ({ value: item.id, label: `${formatDate(item.date)} · ${item.counterpartyName || item.payerInn} · ${formatMoney(item.unallocatedMinor)}` }))} /></Form.Item>}
      {payment && <div className="business-payment-excerpt"><strong>{payment.counterpartyName}</strong><p>{payment.description}</p></div>}
      <Form.Item label="Сумма к зачёту, ₽" required extra={limit > 0 ? <button type="button" className="business-text-button business-amount-fill" onClick={() => setAmount(formatAmountInput(limit))}>Зачесть доступные {formatMoney(limit)}</button> : "Выберите счёт и поступление с доступным остатком"}><Input inputMode="decimal" aria-label="Сумма к зачёту, ₽" value={amount} onChange={event => setAmount(event.target.value)} placeholder="0,00" /></Form.Item>
      <Button type="primary" htmlType="submit" loading={saving} disabled={!invoice || !payment || limit <= 0}>Зачесть оплату</Button>
    </Form>
  </div>;
}

function Allocations({ allocations, workspace, onChanged }: { allocations: BusinessAllocation[]; workspace: BusinessWorkspace; onChanged: () => void }) {
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  async function reverse(id: string) {
    setSavingId(id); setError("");
    try { await reverseBusinessAllocation(id); onChanged(); }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : "Не удалось отменить зачёт. Повторите запрос."); }
    finally { setSavingId(""); }
  }
  return <section><h3 className="business-section-heading">Зачтённые оплаты</h3>{error && <Alert type="error" showIcon message={error} />}{!allocations.length ? <p className="business-intro">По этому документу пока нет зачтённых оплат.</p> : <div className="business-allocation-list">{allocations.map(allocation => {
    const invoice = workspace.invoices.find(item => item.id === allocation.invoiceId);
    const payment = workspace.payments.find(item => item.id === allocation.paymentId);
    return <div className="business-allocation" key={allocation.id}><div><strong>{formatMoney(allocation.amountMinor)}</strong><span className="business-cell-note">Счёт № {invoice?.number ?? "—"} · платёж {formatDate(payment?.date ?? "")} · {allocation.automatic ? "автоматически" : "вручную"}</span></div><Popconfirm title="Отменить зачёт оплаты?" description="Поступление останется в истории и снова станет доступно для распределения." okText="Отменить зачёт" cancelText="Оставить" onConfirm={() => reverse(allocation.id)}><Button size="small" disabled={!!savingId} loading={savingId === allocation.id}>Отменить зачёт</Button></Popconfirm></div>;
  })}</div>}</section>;
}

export function InvoiceDetailDrawer({ invoice: initialInvoice, onClose, onChanged }: { invoice: BusinessInvoiceView | null; onClose: () => void; onChanged: () => void }) {
  const { workspace, loading, error, reload } = useDetailWorkspace(!!initialInvoice);
  const invoice = workspace?.invoices.find(item => item.id === initialInvoice?.id) ?? initialInvoice;
  const payer = workspace?.counterparties.find(item => item.id === invoice?.counterpartyId);
  const history = workspace?.invoices.filter(item => !item.isCurrent && item.id !== invoice?.id && item.counterpartyId === invoice?.counterpartyId && item.templateId === invoice?.templateId && item.period === invoice?.period) ?? [];
  const changed = () => { reload(); onChanged(); };
  return <Drawer open={!!initialInvoice} title={invoice ? `Счёт № ${invoice.number}` : "Счёт"} onClose={onClose} width={680} rootClassName="business-drawer" destroyOnHidden>{invoice && <>
    <div className="business-invoice-hero"><div><p>{payer?.name ?? ""}</p><strong>{formatMoney(invoice.amountMinor)}</strong></div><InvoiceStatusLabel status={invoice.status} /></div>
    {invoice.providerState === "unknown" && <Alert showIcon type="warning" message="Создание в Точке требует проверки" description="Банк не подтвердил результат запроса. Проверьте документ в Точке перед повторным созданием." className="business-form-alert" />}
    {!invoice.isCurrent && <Alert showIcon type="info" message="Архивная версия" description="Документ сохранён для истории и не учитывается в суммах к оплате." className="business-form-alert" />}
    <dl className="business-details"><div><dt>Период услуг</dt><dd>{formatPeriod(invoice.period)}</dd></div><div><dt>Дата счёта</dt><dd>{formatDate(invoice.issueDate)}</dd></div><div><dt>Оплатить до</dt><dd>{invoice.dueDate ? formatDate(invoice.dueDate) : "Не указано"}</dd></div><div><dt>НДС</dt><dd>{invoice.vat || "Без НДС"}</dd></div><div><dt>Основание</dt><dd>{invoice.basis || "—"}</dd></div></dl>
    <section><h3 className="business-section-heading">Документы</h3>{invoice.documents.length ? <div className="business-document-list">{invoice.documents.map(document => <div key={document.id}><span className="business-document-kind">{document.kind === "invoice" ? "Счёт" : document.kind === "act" ? "Акт" : "Документ"}</span><DocumentButton document={document} /><span className="business-cell-note">{Math.max(1, Math.round(document.size / 1024))} КБ</span></div>)}</div> : <p className="business-intro">Файл пока недоступен. Обновите данные после завершения создания.</p>}</section>
    <section><h3 className="business-section-heading">Состав счёта</h3><div className="business-item-list">{invoice.items.map((item, index) => <div key={index}><div><strong>{item.description}</strong><span className="business-cell-note">{item.quantity} {item.unit} × {formatMoney(item.priceMinor)}</span></div><strong>{formatMoney(item.amountMinor)}</strong></div>)}</div></section>
    {error && <Alert type="error" showIcon message={error} action={<Button size="small" onClick={reload}>Повторить</Button>} />}
    {loading && !workspace ? <Skeleton active /> : workspace && <>
      <Allocations allocations={invoice.allocations} workspace={workspace} onChanged={changed} />
      {invoice.isCurrent && invoice.outstandingMinor > 0 && <AllocationForm key={invoice.id} workspace={workspace} invoiceId={invoice.id} onChanged={changed} />}
      {!!history.length && <section><h3 className="business-section-heading">История версий</h3><p className="business-intro">Предыдущие документы сохранены. Их суммы не прибавляются к текущему счёту.</p>{history.map(version => <div className="business-history-entry" key={version.id}><div><strong>Счёт № {version.number} · версия {version.revision}</strong><span className="business-cell-note">{formatDate(version.issueDate)} · {formatMoney(version.amountMinor)}</span></div><div className="business-history-entry__files">{version.documents.map(document => <DocumentButton document={document} key={document.id} compact />)}</div></div>)}</section>}
    </>}
  </>}</Drawer>;
}

export function PaymentDetailDrawer({ payment: initialPayment, onClose, onChanged }: { payment: BusinessPaymentView | null; onClose: () => void; onChanged: () => void }) {
  const { workspace, loading, error, reload } = useDetailWorkspace(!!initialPayment);
  const payment = workspace?.payments.find(item => item.id === initialPayment?.id) ?? initialPayment;
  const changed = () => { reload(); onChanged(); };
  return <Drawer open={!!initialPayment} title="Поступление" width={620} rootClassName="business-drawer" onClose={onClose} destroyOnHidden>{payment && <>
    <div className="business-invoice-hero"><div><p>{payment.counterpartyName || "Плательщик не определён"}</p><strong>{formatMoney(payment.amountMinor)}</strong></div></div>
    <dl className="business-details"><div><dt>Дата поступления</dt><dd>{formatDate(payment.date)}</dd></div><div><dt>ИНН плательщика</dt><dd>{payment.payerInn || "Не указан"}</dd></div><div><dt>Счёт зачисления</dt><dd>{payment.accountLabel || "—"}</dd></div><div><dt>Назначение</dt><dd>{payment.description || "Не указано"}</dd></div><div><dt>Не распределено</dt><dd>{formatMoney(payment.unallocatedMinor)}</dd></div></dl>
    {error && <Alert type="error" showIcon message={error} action={<Button onClick={reload}>Повторить</Button>} />}
    {loading && !workspace ? <Skeleton active /> : workspace ? <><Allocations allocations={payment.allocations} workspace={workspace} onChanged={changed} />{payment.unallocatedMinor > 0 && <AllocationForm key={payment.id} workspace={workspace} paymentId={payment.id} onChanged={changed} />}</> : <Empty description="История не загружена" />}
  </>}</Drawer>;
}
