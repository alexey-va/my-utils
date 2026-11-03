import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "../../api/client";
import { storeSession } from "../../auth/session";
import { allocateBusinessPayment, connectBusinessBank, createBusinessInvoice, disconnectBusinessBank, fetchBusinessWorkspace, reverseBusinessAllocation, syncBusinessBank } from "./api";

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });
const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });

describe("Business API boundary", () => {
  it("uses scoped admin endpoints, kopecks, and uncached private reads", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(json({})));
    vi.stubGlobal("fetch", fetchMock);
    await fetchBusinessWorkspace("2026-10", "payer /?#");
    await createBusinessInvoice({ counterpartyId: "payer", templateId: "lease", period: "2026-11", issueDate: "2026-11-01", items: [{ description: "Test", quantity: "1.25", unit: "month", priceMinor: 12345, amountMinor: 15431 }], provider: "local" });
    await allocateBusinessPayment("invoice", "payment", 123);
    await reverseBusinessAllocation("allocation /?#");
    await connectBusinessBank("synthetic-token");
    await syncBusinessBank("2026-10-01", "2026-10-31");
    await disconnectBusinessBank();
    expect(fetchMock.mock.calls.map(([url, init]) => [url, init.method])).toEqual([
      ["/api/admin/business/?period=2026-10&counterpartyId=payer+%2F%3F%23", "GET"],
      ["/api/admin/business/invoices", "POST"], ["/api/admin/business/allocations", "POST"],
      ["/api/admin/business/allocations/allocation%20%2F%3F%23", "DELETE"],
      ["/api/admin/business/bank/connect", "POST"], ["/api/admin/business/bank/sync", "POST"], ["/api/admin/business/bank/connect", "DELETE"],
    ]);
    expect(fetchMock.mock.calls[0][1].cache).toBe("no-store");
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({ invoiceId: "invoice", paymentId: "payment", amountMinor: 123 });
    expect(localStorage.length).toBe(0);
  });
  it("downloads protected bytes after the shared JWT refresh without corrupting binary data", async () => {
    const user = { id: "test-owner", username: "test", email: "test@example.test", role: "ADMIN" as const, mustChangePassword: false };
    storeSession(user, "expired-synthetic");
    const bytes = new Uint8Array([37, 80, 68, 70, 0, 255, 128]);
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      expect(init).not.toHaveProperty("responseType");
      if (url === "/api/auth/refresh") return json({ user, token: "fresh-synthetic" });
      if (new Headers(init.headers).get("Authorization") === "Bearer expired-synthetic") return new Response(null, { status: 401 });
      return new Response(bytes, { headers: { "content-type": "application/pdf" } });
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await apiRequest<Blob>("/api/admin/business/files/test", { responseType: "blob", cache: "no-store" });
    expect(new Uint8Array(await result.arrayBuffer())).toEqual(bytes);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
