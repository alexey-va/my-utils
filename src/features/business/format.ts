import type { BusinessInvoice, BusinessPaymentView, InvoiceStatus, PaymentClassification } from "./types";

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  paid: "Оплачен", partial: "Частичная оплата", unmatched: "Оплата не найдена в выписках Точки", unreviewed: "Не сверено", archived: "Архивная версия",
};

export const paymentClassificationLabels: Record<PaymentClassification, string> = {
  rental: "Поступление по аренде", historical: "Оплата прошлых периодов", outside_period: "До периода учёта", unclassified: "Назначение требует проверки",
};
export const paymentOutsideAccounting = (payment: Pick<BusinessPaymentView, "classification">): boolean => payment.classification === "historical" || payment.classification === "outside_period";
export const amountRequiringAllocation = (value: Pick<BusinessPaymentView, "unallocatedMinor" | "advanceMinor">): number => Math.max(0, value.unallocatedMinor - value.advanceMinor);

const moneyFormatter = new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const formatMoney = (minor: number): string => `${moneyFormatter.format(minor / 100)} ₽`;
export const formatAmountInput = (minor: number): string => (minor / 100).toFixed(2).replace(/\.00$/, "");
export const formatDate = (value: string): string => {
  if (!value) return "—";
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleDateString("ru-RU");
};
export const formatPeriod = (period: string): string => {
  if (period === "all") return "Все периоды";
  const date = new Date(`${period}-01T12:00:00`);
  if (Number.isNaN(date.valueOf())) return period;
  const label = date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" }).replace(/ г\.$/, "");
  return label[0].toUpperCase() + label.slice(1);
};
export const formatInvoicePeriod = (invoice: Pick<BusinessInvoice, "period" | "periodStart" | "periodEnd">): string => {
  if (invoice.periodStart && invoice.periodEnd && invoice.periodStart.slice(0, 7) !== invoice.periodEnd.slice(0, 7)) {
    return `${formatDate(invoice.periodStart)} — ${formatDate(invoice.periodEnd)}`;
  }
  return formatPeriod(invoice.period);
};
export function parseMoneyMinor(value: string): number | null {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const amount = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  return amount <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(amount) : null;
}
export function lineAmountMinor(priceMinor: number, quantity: string): number | null {
  const normalized = quantity.trim().replace(",", ".");
  if (!Number.isSafeInteger(priceMinor) || priceMinor < 0 || !/^\d+(?:\.\d{1,6})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const numerator = BigInt(whole + fraction);
  if (numerator <= 0n) return null;
  const denominator = 10n ** BigInt(fraction.length);
  const result = (2n * BigInt(priceMinor) * numerator + denominator) / (2n * denominator);
  return result <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(result) : null;
}
export function monthBounds(period: string): { from: string; to: string } {
  const [year, month] = period.split("-").map(Number);
  const days = new Date(year, month, 0).getDate();
  return { from: `${period}-01`, to: `${period}-${days}` };
}
export function localToday(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function hasPeriodCoverage(period: string, from: string, to: string): boolean {
  if (period === "all" || !from || !to || !/^\d{4}-\d{2}$/.test(period)) return false;
  const bounds = monthBounds(period);
  return from <= bounds.from && to >= bounds.to;
}
