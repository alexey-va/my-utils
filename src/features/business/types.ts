export type BusinessContact = { email: string; note: string; confirmed: boolean };
export type BusinessLineItem = { description: string; quantity: string; unit: string; priceMinor: number; amountMinor: number };
export type InvoiceTemplate = { id: string; label: string; basis: string; items: BusinessLineItem[] };
export type BusinessSeller = { name: string; inn: string; address: string; bankName: string; bankBik: string; bankAccount: string; bankCorrespondentAccount: string };
export type BusinessCounterparty = { id: string; name: string; entityType: "company" | "ip" | "person"; inn: string; address: string; contacts: BusinessContact[]; templates: InvoiceTemplate[] };
export type BusinessDocument = { id: string; kind: "invoice" | "act" | "other"; filename: string; mimeType: string; size: number; sha256: string };
export type BusinessInvoice = {
  id: string; counterpartyId: string; templateId: string; number: string; issueDate: string; dueDate: string;
  period: string; periodStart: string; periodEnd: string; basis: string; items: BusinessLineItem[];
  amountMinor: number; currency: "RUB"; vat: string; isCurrent: boolean; revision: number;
  source: string; provider: "local" | "tochka"; providerState: string; bankDocumentId: string;
  documents: BusinessDocument[]; createdAt: string;
};
export type BusinessAllocation = { id: string; invoiceId: string; paymentId: string; amountMinor: number; automatic: boolean };
export type BusinessPayment = { id: string; date: string; amountMinor: number; currency: "RUB"; counterpartyId: string; counterpartyName: string; payerInn: string; description: string; accountLabel: string; source: string };
export type BusinessBank = { connected: boolean; lastSyncedAt: string; coverageStart: string; coverageEnd: string; accountCount: number; error: string };
export type InvoiceStatus = "paid" | "partial" | "unmatched" | "unreviewed" | "archived";
export type BusinessInvoiceView = BusinessInvoice & { paidMinor: number; outstandingMinor: number; status: InvoiceStatus; allocations: BusinessAllocation[] };
export type BusinessPaymentView = BusinessPayment & { allocatedMinor: number; unallocatedMinor: number; allocations: BusinessAllocation[] };
export type BusinessCounterpartyView = BusinessCounterparty & { invoicedMinor: number; paidMinor: number; outstandingMinor: number; receivedMinor: number; invoiceCount: number; unreviewedCount: number; lastPaymentAt: string };
export type BusinessSummary = {
  invoicedMinor: number; paidMinor: number; outstandingMinor: number; receivedMinor: number; unallocatedMinor: number;
  invoiceCount: number; counterpartyCount: number; paidInvoiceCount: number; partialInvoiceCount: number;
  unreviewedInvoiceCount: number; reconciliationComplete: boolean;
};
export type BusinessWorkspace = { seller: BusinessSeller; counterparties: BusinessCounterpartyView[]; invoices: BusinessInvoiceView[]; payments: BusinessPaymentView[]; summary: BusinessSummary; bank: BusinessBank; periods: string[]; nextInvoiceNumber: string };
export type CreateBusinessInvoice = { counterpartyId: string; templateId: string; period: string; issueDate: string; dueDate?: string; number?: string; basis?: string; items: BusinessLineItem[]; provider: "local" | "tochka" };
