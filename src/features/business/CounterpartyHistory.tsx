import { useEffect, useState } from "react";
import { Button } from "antd";
import { fetchBusinessWorkspace } from "./api";
import { formatDate, formatInvoicePeriod, formatMoney, monthBounds, paymentClassificationLabels, paymentOutsideAccounting } from "./format";
import type { BusinessWorkspace } from "./types";

const HISTORY_LIMIT = 3;

export function CounterpartyHistory({ counterpartyId, refreshKey }: { counterpartyId: string; refreshKey: number }) {
  const [data, setData] = useState<BusinessWorkspace | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError(false);
    fetchBusinessWorkspace("all", counterpartyId, controller.signal).then(workspace => {
      if (!controller.signal.aborted) setData(workspace);
    }).catch(() => {
      if (!controller.signal.aborted) setError(true);
    });
    return () => controller.abort();
  }, [counterpartyId, refreshKey, attempt]);

  if (error) return <div className="business-inline-history__error" role="alert"><p>Не удалось загрузить историю плательщика.</p><Button size="small" onClick={() => setAttempt(value => value + 1)}>Повторить загрузку истории</Button></div>;
  if (!data) return <p className="business-inline-history__loading" role="status">Загружаем историю за все периоды…</p>;

  const payerInvoices = data.invoices.filter(invoice => invoice.counterpartyId === counterpartyId);
  const currentInvoices = payerInvoices.filter(invoice => invoice.isCurrent);
  const archivedKeys = new Set<string>();
  const invoices = (currentInvoices.length ? currentInvoices : payerInvoices
    .sort((a, b) => b.revision - a.revision || b.createdAt.localeCompare(a.createdAt) || b.issueDate.localeCompare(a.issueDate) || b.id.localeCompare(a.id))
    .filter(invoice => {
      const month = monthBounds(invoice.period);
      const key = JSON.stringify([invoice.templateId, invoice.periodStart || month.from, invoice.periodEnd || month.to]);
      if (archivedKeys.has(key)) return false;
      archivedKeys.add(key);
      return true;
    })).sort((a, b) => b.issueDate.localeCompare(a.issueDate) || b.number.localeCompare(a.number, "ru", { numeric: true }));
  const payments = data.payments.filter(payment => payment.counterpartyId === counterpartyId).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const coverage = data.bank.coverageStart && data.bank.coverageEnd ? `${formatDate(data.bank.coverageStart)} — ${formatDate(data.bank.coverageEnd)}` : "период покрытия не указан";

  return <>
    <p className="business-inline-history__scope">За все периоды · до {HISTORY_LIMIT} последних записей в каждом списке</p>
    <div className="business-inline-history__columns">
      <section aria-label="Последние счета">
        <h3>Последние счета <span>{invoices.length > HISTORY_LIMIT ? `${HISTORY_LIMIT} из ${invoices.length}` : invoices.length}</span></h3>
        {invoices.length ? <ol>{invoices.slice(0, HISTORY_LIMIT).map(invoice => {
          const issued = invoice.provider === "local" ? ["created", "imported"].includes(invoice.providerState) : invoice.providerState === "created" && !!invoice.bankDocumentId;
          return <li key={invoice.id}>
          <div><strong>{invoice.isCurrent ? "Счёт" : "Архивный счёт"} № {invoice.number}</strong>{issued ? <span>Выставлен {formatDate(invoice.issueDate)}</span> : <><span>{invoice.providerState === "rejected" ? "Создание отклонено банком" : "Создание не подтверждено"}</span><span>Дата запроса {formatDate(invoice.createdAt)}</span></>}<span>За {formatInvoicePeriod(invoice).toLocaleLowerCase("ru")}</span></div>
          <strong className="business-inline-history__amount">{formatMoney(invoice.amountMinor)}</strong>
        </li>;
        })}</ol> : <p className="business-inline-history__empty">Счетов пока нет.</p>}
        {!currentInvoices.length && invoices.length > 0 && <p className="business-inline-history__coverage">Архивные документы не входят в текущий баланс.</p>}
      </section>
      <section aria-label="Последние поступления">
        <h3>Полученные платежи <span>{payments.length > HISTORY_LIMIT ? `${HISTORY_LIMIT} из ${payments.length}` : payments.length}</span></h3>
        {payments.length ? <ol>{payments.slice(0, HISTORY_LIMIT).map(payment => <li key={payment.id}>
          <div><strong>Поступление {formatDate(payment.date)}</strong><span>{paymentOutsideAccounting(payment) || payment.classification === "unclassified" ? paymentClassificationLabels[payment.classification] : "По выписке Точки"}</span></div>
          <strong className="business-inline-history__amount">{formatMoney(payment.amountMinor)}</strong>
        </li>)}</ol> : <p className="business-inline-history__empty">В загруженных выписках поступления не найдены.</p>}
        <p className="business-inline-history__coverage">{data.bank.lastSyncedAt ? `Выписки: ${coverage}. Обновлены ${formatDate(data.bank.lastSyncedAt)}.` : "Данные выписок могут быть неполными. Отсутствие поступлений не подтверждает отсутствие оплаты."}{data.bank.error ? " Последнее обновление выписок не завершилось." : ""}</p>
      </section>
    </div>
  </>;
}
