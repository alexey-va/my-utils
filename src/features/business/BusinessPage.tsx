import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Alert, Button, ConfigProvider, Input, Pagination, Select, Skeleton, Switch, message } from "antd";
import ruRU from "antd/es/locale/ru_RU";
import { ArrowLeftOutlined, BankOutlined, FileTextOutlined, InfoCircleOutlined, PlusOutlined, ReloadOutlined, SearchOutlined, TeamOutlined } from "@ant-design/icons";
import PageLayout from "../../shared/components/PageLayout";
import AppPanel from "../../shared/components/AppPanel";
import { fetchBusinessWorkspace } from "./api";
import { BusinessOverview, CounterpartyLedger } from "./BusinessOverview";
import { InvoiceLedger, PaymentLedger } from "./BusinessLedgers";
import { InvoiceDetailDrawer, PaymentDetailDrawer } from "./BusinessDetails";
import InvoiceEditor from "./InvoiceEditor";
import BankDrawer from "./BankDrawer";
import { amountRequiringAllocation, formatMoney, formatPeriod, hasPeriodCoverage, invoiceStatusLabels } from "./format";
import type { BusinessInvoiceView, BusinessPaymentView, BusinessWorkspace, InvoiceStatus } from "./types";
import "./business.css";

type BusinessView = "payers" | "invoices" | "payments";
const PAGE_SIZE = 15;

export default function BusinessPage() {
  const [params, setParams] = useSearchParams();
  const periodParam = params.get("period");
  const period = periodParam && /^(all|\d{4}-\d{2})$/.test(periodParam) ? periodParam : "all";
  const counterpartyId = params.get("payer") ?? "";
  const viewParam = params.get("view");
  const view: BusinessView = viewParam === "invoices" || viewParam === "payments" ? viewParam : counterpartyId ? "invoices" : "payers";
  const scope = `${period}:${counterpartyId}`;
  const [result, setResult] = useState<{ scope: string; data: BusinessWorkspace } | null>(null);
  const [query, setQuery] = useState("");
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatus | "all">("all");
  const [includeArchive, setIncludeArchive] = useState(false);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [detailInvoice, setDetailInvoice] = useState<BusinessInvoiceView | null>(null);
  const [detailPayment, setDetailPayment] = useState<BusinessPaymentView | null>(null);
  const [messageApi, context] = message.useMessage();
  const workspace = result?.scope === scope ? result.data : null;
  const payer = workspace?.counterparties.find(item => item.id === counterpartyId);
  const paymentsKnown = !!workspace && (workspace.payments.length > 0 || hasPeriodCoverage(period, workspace.bank.coverageStart, workspace.bank.coverageEnd));
  const accountingPeriods = Array.from(new Set(result?.data.accountingPeriods ?? [])).sort();
  const accountingPeriodLabel = accountingPeriods.map(value => formatPeriod(value).toLocaleLowerCase("ru")).join(" · ");
  const periodOptions = Array.from(new Set([...(result?.data.periods ?? []), ...(period !== "all" ? [period] : [])])).sort().reverse();
  const requiresAllocation = workspace ? amountRequiringAllocation(workspace.summary) : 0;
  const scopeTitle = period === "all" ? "Расчёты за все периоды" : `Расчёты за ${formatPeriod(period).toLocaleLowerCase("ru")}`;
  const reload = () => setRevision(value => value + 1);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    fetchBusinessWorkspace(period, counterpartyId || undefined, controller.signal).then(data => {
      if (controller.signal.aborted) return;
      setResult({ scope, data });
    }).catch(() => {
      if (!controller.signal.aborted) setError("Не удалось загрузить данные. Проверьте соединение и повторите запрос.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [period, counterpartyId, scope, revision]);

  const rows = useMemo(() => {
    if (!workspace) return { payers: [], invoices: [], payments: [] };
    const needle = query.trim().toLocaleLowerCase("ru");
    const names = new Map(workspace.counterparties.map(item => [item.id, item.name]));
    const matches = (value: string) => value.toLocaleLowerCase("ru").includes(needle);
    return {
      payers: workspace.counterparties.filter(item => matches(`${item.name} ${item.inn}`)),
      invoices: workspace.invoices.filter(item => (includeArchive || item.isCurrent) && (invoiceStatus === "all" || item.status === invoiceStatus) && matches(`${item.number} ${item.basis} ${names.get(item.counterpartyId) ?? ""}`)).sort((a, b) => b.period.localeCompare(a.period) || Number(b.isCurrent) - Number(a.isCurrent) || b.number.localeCompare(a.number, "ru", { numeric: true })),
      payments: workspace.payments.filter(item => matches(`${item.counterpartyName} ${item.payerInn} ${item.description}`)).sort((a, b) => b.date.localeCompare(a.date)),
    };
  }, [workspace, query, includeArchive, invoiceStatus]);
  const selectedRows = rows[view];
  const currentPage = Math.min(page, Math.max(1, Math.ceil(selectedRows.length / PAGE_SIZE)));
  const offset = (currentPage - 1) * PAGE_SIZE;

  function changeScope(values: Record<string, string | null>) {
    setParams(current => { const next = new URLSearchParams(current); for (const [key, value] of Object.entries(values)) { if (value === null) next.delete(key); else next.set(key, value); } return next; });
    setPage(1); setQuery(""); setDetailInvoice(null); setDetailPayment(null);
  }
  function created(invoice: BusinessInvoiceView) {
    setCreateOpen(false); setIncludeArchive(false); setInvoiceStatus("all");
    changeScope({ period: invoice.period, view: "invoices", payer: counterpartyId || null });
    reload(); setDetailInvoice(invoice);
    messageApi.success(invoice.providerState === "unknown" ? "Запрос сохранён. Создание в банке требует проверки." : `Счёт № ${invoice.number} создан`);
  }

  return <ConfigProvider locale={ruRU}><div className="business-page">{context}<PageLayout title={payer?.name ?? "Бизнес"} subtitle={payer ? "Счета и поступления плательщика" : "Счета, акты и сверка поступлений"} actions={<Button type="primary" icon={<PlusOutlined />} disabled={!workspace?.counterparties.length} onClick={() => setCreateOpen(true)}>Создать счёт</Button>}>
    {counterpartyId && <Button type="text" className="business-back" icon={<ArrowLeftOutlined />} onClick={() => changeScope({ payer: null, view: "payers" })}>Все плательщики</Button>}
    <div className="business-context-bar"><div className="business-period-control"><Select aria-label="Период" value={period} onChange={value => changeScope({ period: value })} options={[{ value: "all", label: "Все периоды" }, ...periodOptions.map(value => ({ value, label: formatPeriod(value) }))]} />{period !== "all" && <Button onClick={() => changeScope({ period: "all" })}>Показать все периоды</Button>}</div><Button type="text" icon={<ReloadOutlined />} loading={loading} onClick={reload}>Обновить</Button></div>
    <section className="business-scope" aria-label="Область расчётов"><h2>{scopeTitle}</h2><p>{period === "all" ? `${accountingPeriodLabel ? `Текущие счета: ${accountingPeriodLabel}.` : "Общий баланс по счетам всех месяцев."} Архивные версии не увеличивают сумму.` : "Начисления, оплаты и остаток по счетам — только за выбранный месяц. Авансы показаны отдельно за все периоды."}</p>{accountingPeriods.length > 0 && <nav className="business-period-links" aria-label="Месяцы учёта"><span>Месяцы учёта:</span>{accountingPeriods.map(value => <Button key={value} type="text" size="small" aria-pressed={period === value} onClick={() => changeScope({ period: value })}>{formatPeriod(value)}</Button>)}</nav>}</section>
    {error && <Alert className="business-load-error" type="error" showIcon message={error} description={workspace ? "На экране остаются данные последней успешной загрузки." : undefined} action={<Button onClick={reload}>Повторить</Button>} />}
    {!workspace ? !error && <div className="business-loading"><Skeleton active paragraph={{ rows: 3 }} /><Skeleton active paragraph={{ rows: 8 }} /></div> : <>
      <BusinessOverview summary={workspace.summary} bank={workspace.bank} onBank={() => setBankOpen(true)} />
      {requiresAllocation > 0 && <div className="business-review-strip"><InfoCircleOutlined /><p><strong>{formatMoney(requiresAllocation)} требуют распределения.</strong> Авансы учтены отдельно и не входят в эту сумму.</p><Button type="link" onClick={() => changeScope({ view: "payments" })}>Распределить</Button></div>}
      {payer && <details className="business-payer-details"><summary>Реквизиты и контакты</summary><dl className="business-details"><div><dt>ИНН</dt><dd>{payer.inn || "Не указан"}</dd></div>{payer.address && <div><dt>Адрес</dt><dd>{payer.address}</dd></div>}{payer.contacts.map((contact, index) => <div key={index}><dt>Email {contact.confirmed ? "" : "(не подтверждён)"}</dt><dd>{contact.email}{contact.note && <span className="business-cell-note">{contact.note}</span>}</dd></div>)}</dl></details>}
      <AppPanel className="business-register">
        <nav className="business-view-tabs" aria-label="Разделы бизнеса">
          {!counterpartyId && <button type="button" aria-current={view === "payers" ? "page" : undefined} onClick={() => changeScope({ view: "payers" })}><TeamOutlined />Плательщики<span>{workspace.counterparties.length}</span></button>}
          <button type="button" aria-current={view === "invoices" ? "page" : undefined} onClick={() => changeScope({ view: "invoices" })}><FileTextOutlined />Счета и акты<span>{workspace.summary.invoiceCount}</span></button>
          <button type="button" aria-current={view === "payments" ? "page" : undefined} onClick={() => changeScope({ view: "payments" })}><BankOutlined />Поступления <span>{workspace.payments.length}</span></button>
        </nav>
        <div className="business-register__top"><div><h2>{view === "payers" ? "Расчёты с плательщиками" : view === "invoices" ? "Реестр документов" : "Поступления"}</h2><p>{view === "payers" ? `${period === "all" ? "Баланс счетов и авансы за все периоды" : `Счета за ${formatPeriod(period).toLocaleLowerCase("ru")}, авансы за все периоды`}. Нажмите на плательщика, чтобы открыть всю историю.` : view === "invoices" ? "Счёт и акт относятся к одной сумме. Все версии доступны в истории." : "Поступления за все периоды. Выбранный месяц ограничивает только сводку; записи до начала учёта не входят в текущие суммы."}</p></div><Input prefix={<SearchOutlined />} allowClear placeholder={view === "payers" ? "Название или ИНН" : view === "invoices" ? "Номер, плательщик, основание" : "Плательщик или назначение"} aria-label="Поиск в бизнесе" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} /></div>
        {view === "invoices" && <div className="business-register__filters"><Select aria-label="Статус счёта" value={invoiceStatus} onChange={value => { setInvoiceStatus(value); setPage(1); }} options={[{ value: "all", label: "Все статусы" }, ...(["paid", "partial", "unmatched", "unreviewed"] as InvoiceStatus[]).map(value => ({ value, label: invoiceStatusLabels[value] }))]} /><label className="business-switch-label"><Switch size="small" checked={includeArchive} onChange={value => { setIncludeArchive(value); setPage(1); }} />Архивные версии</label></div>}
        {view === "payments" && <div className="business-payments-summary"><div><span>{period === "all" ? "Поступило за месяцы учёта" : "Поступило за выбранный период"}</span><strong>{paymentsKnown ? formatMoney(workspace.summary.receivedMinor) : "Нет данных"}</strong><span className="business-cash-periods">{period === "all" ? accountingPeriodLabel || "Месяцы учёта пока не заданы" : formatPeriod(period)}</span>{workspace.summary.historicalReceivedMinor > 0 && <span className="business-cash-history">Поступления до начала учёта за {period === "all" ? accountingPeriodLabel || "выбранные месяцы" : formatPeriod(period).toLocaleLowerCase("ru")}: {formatMoney(workspace.summary.historicalReceivedMinor)}. Не входят в текущие поступления.</span>}</div><div><span>Требует распределения</span><strong>{paymentsKnown ? formatMoney(requiresAllocation) : "Нет данных"}</strong><span className="business-cash-periods">За все периоды</span></div><div><span>Аванс</span><strong>{paymentsKnown ? formatMoney(workspace.summary.advanceMinor) : "Нет данных"}</strong><span className="business-cash-periods">За все периоды</span></div></div>}
        <div aria-busy={loading}>
          {view === "payers" && <CounterpartyLedger rows={rows.payers.slice(offset, offset + PAGE_SIZE)} onOpen={id => changeScope({ payer: id, view: "invoices", period: "all" })} />}
          {view === "invoices" && <InvoiceLedger rows={rows.invoices.slice(offset, offset + PAGE_SIZE)} counterparties={workspace.counterparties} onOpen={id => setDetailInvoice(workspace.invoices.find(item => item.id === id) ?? null)} />}
          {view === "payments" && <PaymentLedger rows={rows.payments.slice(offset, offset + PAGE_SIZE)} invoices={workspace.invoices} onOpen={id => setDetailPayment(workspace.payments.find(item => item.id === id) ?? null)} />}
        </div>
        <div className="business-register__footer"><span>{selectedRows.length ? `${offset + 1}–${Math.min(offset + PAGE_SIZE, selectedRows.length)} из ${selectedRows.length}` : "Нет записей"}</span>{selectedRows.length > PAGE_SIZE && <Pagination size="small" pageSize={PAGE_SIZE} current={currentPage} total={selectedRows.length} showSizeChanger={false} onChange={setPage} />}</div>
      </AppPanel>
      <p className="business-footnote">{workspace.seller.name ? `${workspace.seller.name} · ` : ""}Суммы в рублях. Архивные счета и акты не увеличивают начисления.</p>
      <InvoiceEditor open={createOpen} workspace={workspace} counterpartyId={counterpartyId} onClose={() => setCreateOpen(false)} onCreated={created} />
      <BankDrawer open={bankOpen} bank={workspace.bank} period={period} onClose={() => setBankOpen(false)} onChanged={reload} />
    </>}
    <InvoiceDetailDrawer invoice={detailInvoice} onClose={() => setDetailInvoice(null)} onChanged={reload} />
    <PaymentDetailDrawer payment={detailPayment} onClose={() => setDetailPayment(null)} onChanged={reload} />
  </PageLayout></div></ConfigProvider>;
}
