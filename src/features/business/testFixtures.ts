import type { BusinessInvoiceView, BusinessPaymentView, BusinessWorkspace } from "./types";

export function businessTestPayment(overrides: Partial<BusinessPaymentView> = {}): BusinessPaymentView {
  return { id: "payment-1", date: "2026-10-20", amountMinor: 50000, currency: "RUB", counterpartyId: "payer-1", counterpartyName: "Тестовый плательщик", payerInn: "0000000001", description: "Тестовая аренда", accountLabel: "Тестовый счёт", source: "synthetic", classification: "rental", allocatedMinor: 0, unallocatedMinor: 50000, advanceMinor: 0, allocations: [], ...overrides };
}

/** Synthetic records for tests only. Never imported by the application. */
export function businessTestWorkspace(): BusinessWorkspace {
  const item = { description: "Тестовая аренда", quantity: "1", unit: "мес.", priceMinor: 123456, amountMinor: 123456 };
  const invoice: BusinessInvoiceView = { id: "invoice-1", counterpartyId: "payer-1", templateId: "template-1", number: "101", issueDate: "2026-10-01", dueDate: "2026-10-10", period: "2026-10", periodStart: "2026-10-01", periodEnd: "2026-10-31", basis: "Тестовый договор № 1", items: [item], amountMinor: 123456, currency: "RUB", vat: "Без НДС", isCurrent: true, revision: 2, source: "synthetic", provider: "local", providerState: "created", bankDocumentId: "", documents: [{ id: "file-1", kind: "invoice", filename: "test-invoice.pdf", mimeType: "application/pdf", size: 2048, sha256: "synthetic" }, { id: "act-1", kind: "act", filename: "test-act.pdf", mimeType: "application/pdf", size: 1024, sha256: "synthetic-act" }], createdAt: "2026-10-01T10:00:00Z", paidMinor: 0, outstandingMinor: 123456, status: "unreviewed", allocations: [] };
  return {
    seller: { name: "Тестовый продавец", inn: "000000000000", address: "Тестовый адрес", bankName: "Тестовый банк", bankBik: "000000000", bankAccount: "00000000000000000000", bankCorrespondentAccount: "00000000000000000000" },
    counterparties: [{ id: "payer-1", name: "ООО «Тестовый склад»", entityType: "company", inn: "0000000001", address: "Тестовый адрес 1", contacts: [], templates: [{ id: "template-1", label: "Договор № 1 · тестовое помещение", basis: "Тестовый договор № 1", items: [item] }], invoicedMinor: 123456, paidMinor: 0, outstandingMinor: 123456, receivedMinor: 0, advanceMinor: 0, invoiceCount: 1, unreviewedCount: 1, lastPaymentAt: "" }],
    invoices: [invoice, { ...invoice, id: "invoice-old", number: "100", amountMinor: 999999, isCurrent: false, revision: 1, status: "archived", outstandingMinor: 0, documents: [] }],
    payments: [],
    summary: { invoicedMinor: 123456, paidMinor: 0, outstandingMinor: 123456, receivedMinor: 0, unallocatedMinor: 0, advanceMinor: 0, historicalReceivedMinor: 0, invoiceCount: 1, counterpartyCount: 1, paidInvoiceCount: 0, partialInvoiceCount: 0, unreviewedInvoiceCount: 1, reconciliationComplete: false },
    bank: { connected: false, lastSyncedAt: "", coverageStart: "", coverageEnd: "", accountCount: 0, error: "" },
    periods: ["2026-09", "2026-10"], accountingPeriods: ["2026-09", "2026-10"], nextInvoiceNumber: "102",
  };
}
