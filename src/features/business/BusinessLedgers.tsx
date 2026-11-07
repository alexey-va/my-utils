import { useState } from "react";
import { Button, Empty, message } from "antd";
import { ArrowRightOutlined, DownloadOutlined, FileTextOutlined } from "@ant-design/icons";
import { downloadBusinessDocument } from "./api";
import { amountRequiringAllocation, formatDate, formatMoney, formatInvoicePeriod, paymentClassificationLabels, paymentOutsideAccounting } from "./format";
import { InvoiceStatusLabel } from "./BusinessOverview";
import type { BusinessCounterpartyView, BusinessDocument, BusinessInvoiceView, BusinessPaymentView } from "./types";

export function DocumentButton({ document, compact = false }: { document: BusinessDocument; compact?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [messageApi, context] = message.useMessage();
  const label = document.kind === "invoice" ? "Счёт" : document.kind === "act" ? "Акт" : "Документ";
  async function download() {
    setLoading(true);
    try { await downloadBusinessDocument(document); }
    catch { messageApi.error("Не удалось скачать файл. Попробуйте ещё раз."); }
    finally { setLoading(false); }
  }
  return <>{context}<Button size={compact ? "small" : "middle"} type={compact ? "text" : "default"} icon={<DownloadOutlined />} loading={loading} onClick={download} aria-label={`Скачать ${document.filename}`} title={document.filename}>{compact ? label : document.filename}</Button></>;
}

export function InvoiceLedger({ rows, counterparties, onOpen }: { rows: BusinessInvoiceView[]; counterparties: BusinessCounterpartyView[]; onOpen: (id: string) => void }) {
  if (!rows.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Подходящих счетов пока нет. Измените фильтры или создайте новый счёт." />;
  const names = new Map(counterparties.map(payer => [payer.id, payer.name]));
  return <div className="business-ledger" role="table" aria-label="Счета и акты">
    <div className="business-ledger__head business-invoice-grid" role="row"><span role="columnheader">Счёт / плательщик</span><span role="columnheader">Период</span><span role="columnheader">Статус</span><span role="columnheader">Сумма</span><span role="columnheader">Документы</span></div>
    {rows.map(row => {
      const quickFiles = ["invoice", "act"].flatMap(kind => { const file = row.documents.find(document => document.kind === kind && document.mimeType === "application/pdf") ?? row.documents.find(document => document.kind === kind); return file ? [file] : []; });
      return <div className={`business-invoice-grid business-ledger__row${row.isCurrent ? "" : " business-ledger__row--archived"}`} role="row" key={row.id}>
        <div className="business-invoice-name" role="cell"><FileTextOutlined /><div><button className="business-text-button business-payer-title" onClick={() => onOpen(row.id)}>Счёт № {row.number}</button><span className="business-cell-note">{names.get(row.counterpartyId) ?? "Плательщик"}</span></div></div>
        <div role="cell" className="business-invoice-period"><span className="business-mobile-label">Период</span>{formatInvoicePeriod(row)}<span className="business-cell-note">от {formatDate(row.issueDate)}</span></div>
        <div role="cell" className="business-invoice-status"><InvoiceStatusLabel status={row.status} />{row.providerState === "unknown" && <span className="business-cell-note">Создание в банке требует проверки</span>}</div>
        <div className="business-money-cell" role="cell"><span className="business-mobile-label">Сумма</span>{formatMoney(row.amountMinor)}{row.paidMinor > 0 && <span className="business-cell-note">Оплачено {formatMoney(row.paidMinor)}</span>}</div>
        <div className="business-quick-files" role="cell">{quickFiles.map(document => <DocumentButton key={document.id} document={document} compact />)}<Button type="text" size="small" icon={<ArrowRightOutlined />} aria-label={`Открыть счёт ${row.number}`} onClick={() => onOpen(row.id)} /></div>
      </div>;
    })}
  </div>;
}

export function PaymentLedger({ rows, invoices, onOpen }: { rows: BusinessPaymentView[]; invoices: BusinessInvoiceView[]; onOpen: (id: string) => void }) {
  if (!rows.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Поступления не найдены. Измените условия поиска или загрузите выписку." />;
  const historicalInvoices = new Map(invoices.filter(invoice => !invoice.isCurrent).map(invoice => [invoice.id, invoice]));
  return <div className="business-ledger" role="table" aria-label="Поступления">
    <div className="business-ledger__head business-payment-grid" role="row"><span role="columnheader">Плательщик / назначение</span><span role="columnheader">Дата</span><span role="columnheader">Поступило</span><span role="columnheader">Сверка</span><span role="columnheader" className="business-sr-only">Открыть</span></div>
    {rows.map(row => <div className={`business-payment-grid business-ledger__row${paymentOutsideAccounting(row) ? " business-ledger__row--historical" : ""}`} role="row" key={row.id}>
      <div className="business-payment-name" role="cell"><button className="business-text-button business-payer-title" onClick={() => onOpen(row.id)}>{row.counterpartyName || "Плательщик не определён"}</button><span className="business-cell-note business-payment-purpose">{row.description}</span>{row.classification === "unclassified" && <span className="business-cell-note">{paymentClassificationLabels.unclassified}</span>}</div>
      <div role="cell"><span className="business-mobile-label">Дата</span>{formatDate(row.date)}</div>
      <div role="cell" className="business-money-cell"><span className="business-mobile-label">Поступило</span>{formatMoney(row.amountMinor)}</div>
      <div role="cell" className="business-money-cell"><span className="business-mobile-label">Сверка</span>{paymentOutsideAccounting(row) ? <span className="business-payment-classification">{paymentClassificationLabels[row.classification]}{row.historicalInvoiceId && <span className="business-cell-note">{historicalInvoices.has(row.historicalInvoiceId) ? `Архивный счёт № ${historicalInvoices.get(row.historicalInvoiceId)!.number}` : "Связан с архивным счётом"}</span>}</span> : <div className="business-payment-reconciliation">{amountRequiringAllocation(row) > 0 && <div>{formatMoney(amountRequiringAllocation(row))}<span className="business-cell-note">Требует распределения</span></div>}{row.advanceMinor > 0 && <div>{formatMoney(row.advanceMinor)}<span className="business-cell-note">Аванс</span></div>}{row.unallocatedMinor === 0 && <span className="business-status business-status--paid"><span />Распределено</span>}</div>}</div>
      <div role="cell" className="business-row-arrow"><Button type="text" icon={<ArrowRightOutlined />} aria-label={`Открыть платёж от ${row.counterpartyName}`} onClick={() => onOpen(row.id)} /></div>
    </div>)}
  </div>;
}
