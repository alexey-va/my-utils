import { apiClient } from "../../api/client";
import { apiEndpoints } from "../../api/endpoints";
import type { BusinessAllocation, BusinessBank, BusinessDocument, BusinessInvoiceView, BusinessWorkspace, CreateBusinessInvoice } from "./types";

export function fetchBusinessWorkspace(period: string, counterpartyId?: string, signal?: AbortSignal): Promise<BusinessWorkspace> {
  const query = new URLSearchParams({ period });
  if (counterpartyId) query.set("counterpartyId", counterpartyId);
  return apiClient.get(`${apiEndpoints.admin.business}?${query}`, { cache: "no-store", signal });
}

export function createBusinessInvoice(body: CreateBusinessInvoice): Promise<BusinessInvoiceView> {
  return apiClient.post(apiEndpoints.admin.businessInvoices, body);
}

export function allocateBusinessPayment(invoiceId: string, paymentId: string, amountMinor: number): Promise<BusinessAllocation> {
  return apiClient.post(apiEndpoints.admin.businessAllocations, { invoiceId, paymentId, amountMinor });
}

export function reverseBusinessAllocation(id: string): Promise<void> {
  return apiClient.delete(apiEndpoints.admin.businessAllocation(id));
}

export function connectBusinessBank(token: string): Promise<BusinessBank> {
  return apiClient.post(apiEndpoints.admin.businessBankConnect, { token });
}

export function disconnectBusinessBank(): Promise<void> {
  return apiClient.delete(apiEndpoints.admin.businessBankConnect);
}

export function syncBusinessBank(from: string, to: string): Promise<BusinessBank> {
  return apiClient.post(apiEndpoints.admin.businessBankSync, { from, to });
}

export async function downloadBusinessDocument(document: BusinessDocument): Promise<void> {
  const blob = await apiClient.get<Blob>(apiEndpoints.admin.businessFile(document.id), { responseType: "blob", cache: "no-store" });
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = document.filename;
  window.document.body.append(link);
  link.click();
  link.remove();
  // Browsers may consume the object URL after the click dispatch completes.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
