import { Fragment, useId, useState } from "react";
import { ArrowRightOutlined, BankOutlined, CheckCircleOutlined, ClockCircleOutlined, DownOutlined, ExclamationCircleOutlined, FileTextOutlined, WalletOutlined } from "@ant-design/icons";
import { Button, Empty } from "antd";
import { CounterpartyActivity } from "./CounterpartyActivity";
import { CounterpartyHistory } from "./CounterpartyHistory";
import { formatDate, formatMoney, formatPeriod, invoiceStatusLabels } from "./format";
import type { BusinessBank, BusinessCounterpartyView, BusinessSummary, InvoiceStatus } from "./types";

export function InvoiceStatusLabel({ status }: { status: InvoiceStatus }) {
  return <span className={`business-status business-status--${status}`}><span aria-hidden="true" />{invoiceStatusLabels[status]}</span>;
}

export function BusinessOverview({ summary, bank, onBank }: { summary: BusinessSummary; bank: BusinessBank; onBank: () => void }) {
  const noPaymentEvidence = summary.unreviewedInvoiceCount > 0 && summary.paidMinor === 0;
  return <>
    <section className="business-summary" aria-label="Финансовая сводка">
      <div className="business-metric">
        <span className="business-metric__label">Выставлено</span>
        <strong className="business-metric__value">{formatMoney(summary.invoicedMinor)}</strong>
        <span className="business-metric__caption"><FileTextOutlined /> Счетов: {summary.invoiceCount} · плательщиков: {summary.counterpartyCount}</span>
      </div>
      <div className="business-metric">
        <span className="business-metric__label">Оплачено по счетам</span>
        <strong className={`business-metric__value${noPaymentEvidence ? " business-metric__value--unknown" : ""}`}>{noPaymentEvidence ? "Нет данных" : formatMoney(summary.paidMinor)}</strong>
        <span className="business-metric__caption"><CheckCircleOutlined /> {noPaymentEvidence ? "Нужна сверка с поступлениями" : `Полностью оплачено: ${summary.paidInvoiceCount}`}</span>
      </div>
      <div className="business-metric">
        <span className="business-metric__label">{summary.reconciliationComplete ? "Остаток к оплате" : "Остаток без подтверждения оплаты"}</span>
        <strong className="business-metric__value">{formatMoney(summary.outstandingMinor)}</strong>
        <span className="business-metric__caption"><ClockCircleOutlined /> {summary.reconciliationComplete ? "По сверенным счетам" : "Сверка не завершена · это не подтверждённый долг"}</span>
      </div>
      <div className="business-metric">
        <span className="business-metric__label">Аванс</span>
        <strong className={`business-metric__value${noPaymentEvidence && summary.advanceMinor === 0 ? " business-metric__value--unknown" : ""}`}>{noPaymentEvidence && summary.advanceMinor === 0 ? "Нет данных" : formatMoney(summary.advanceMinor)}</strong>
        <span className="business-metric__caption"><WalletOutlined /> За все периоды · для будущих счетов</span>
      </div>
    </section>
    <div className="business-bank-strip">
      <BankOutlined className="business-bank-strip__icon" />
      <div>
        <strong>{bank.connected ? "Точка подключена" : bank.lastSyncedAt ? "Выписки Точки загружены" : "Сверка с Точкой не подключена"}</strong>
        <p>{bank.error ? "Последняя синхронизация не завершилась. Проверьте подключение." : bank.lastSyncedAt ? `Последняя синхронизация ${formatDate(bank.lastSyncedAt)}. ${bank.coverageStart && bank.coverageEnd ? `Выписка: ${formatDate(bank.coverageStart)} — ${formatDate(bank.coverageEnd)}.` : "Полного покрытия выпиской пока нет."}` : "Подключите Точку и загрузите поступления, чтобы сопоставить их со счетами."}</p>
      </div>
      <Button onClick={onBank}>{bank.connected ? "Сверить оплаты" : bank.lastSyncedAt ? "Подключить для обновления" : "Подключить банк"}</Button>
    </div>
  </>;
}

function missingPreviousDocuments(row: BusinessCounterpartyView, previousPeriod?: string): string {
  if (row.inactive || !previousPeriod || !row.previousPeriodDocuments) return "";
  const { invoice, act } = row.previousPeriodDocuments;
  if (invoice && act) return "";
  return `${formatPeriod(previousPeriod)}: нет ${!invoice && !act ? "счёта и акта" : !invoice ? "счёта" : "акта"}`;
}

export function CounterpartyLedger({ rows, onOpen, previousPeriod, refreshKey = 0, refreshing = false, onChanged = () => undefined }: { rows: BusinessCounterpartyView[]; onOpen: (id: string) => void; previousPeriod?: string; refreshKey?: number; refreshing?: boolean; onChanged?: () => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const historyId = useId();
  if (!rows.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Плательщики не найдены. Измените поиск или выберите другой период." />;
  return <div className="business-ledger" role="table" aria-label="Плательщики">
    <div className="business-ledger__head business-payer-grid" role="row">
      <span role="columnheader">Плательщик</span><span role="columnheader">Выставлено</span><span role="columnheader">Оплачено</span><span role="columnheader">Остаток</span><span role="columnheader">Аванс</span><span role="columnheader" className="business-sr-only">Открыть</span>
    </div>
    {rows.map(row => {
      const missingDocuments = missingPreviousDocuments(row, previousPeriod);
      return <Fragment key={row.id}><div className={`business-payer-grid business-ledger__row${expandedId === row.id ? " business-ledger__row--expanded" : ""}${missingDocuments ? " business-ledger__row--missing-documents" : ""}`} role="row">
      <div className="business-payer-name" role="cell">
        <span className="business-payer-monogram" aria-hidden="true">{row.name.replace(/^(ООО|ИП|АО)\s*[«"]?/i, "").slice(0, 2).toUpperCase()}</span>
        <div><button className="business-text-button business-payer-title" onClick={() => onOpen(row.id)}>{row.name}</button><span className="business-cell-note">{row.inn ? `ИНН ${row.inn}` : "Физическое лицо"} · счетов: {row.invoiceCount}</span>{row.inactive && <span className="business-cell-note business-inactive-label">Неактивен</span>}{missingDocuments && <span className="business-period-warning"><ExclamationCircleOutlined aria-hidden="true" />{missingDocuments}</span>}<button type="button" className="business-history-toggle" aria-label={`Краткая история ${row.name}`} aria-expanded={expandedId === row.id} aria-controls={`${historyId}-${row.id}`} onClick={() => setExpandedId(value => value === row.id ? null : row.id)}><DownOutlined aria-hidden="true" />Краткая история</button></div>
      </div>
      <div className="business-money-cell" role="cell"><span className="business-mobile-label">Выставлено</span>{formatMoney(row.invoicedMinor)}</div>
      <div className="business-money-cell" role="cell"><span className="business-mobile-label">Оплачено</span>{row.unreviewedCount > 0 && row.paidMinor === 0 ? <span className="business-muted">Не сверено</span> : formatMoney(row.paidMinor)}</div>
      <div className="business-money-cell" role="cell"><span className="business-mobile-label">Остаток</span>{formatMoney(row.outstandingMinor)}{row.unreviewedCount > 0 && <span className="business-cell-note">Без подтверждения оплаты</span>}</div>
      <div className="business-money-cell" role="cell"><span className="business-mobile-label">Аванс</span>{row.unreviewedCount > 0 && row.paidMinor === 0 && row.advanceMinor === 0 ? <span className="business-muted">Не сверено</span> : formatMoney(row.advanceMinor)}</div>
      <div className="business-row-arrow" role="cell"><Button type="text" icon={<ArrowRightOutlined />} aria-label={`Открыть ${row.name}`} onClick={() => onOpen(row.id)} /></div>
    </div>{expandedId === row.id && <div className="business-inline-history" role="row" id={`${historyId}-${row.id}`}><div role="cell" aria-colspan={6}><CounterpartyHistory counterpartyId={row.id} refreshKey={refreshKey} />{typeof row.inactive === "boolean" && <CounterpartyActivity counterparty={row} refreshing={refreshing} onChanged={onChanged} />}</div></div>}</Fragment>;
    })}
  </div>;
}
