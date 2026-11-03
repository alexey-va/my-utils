import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/errors";
import BusinessPage from "./BusinessPage";
import InvoiceEditor from "./InvoiceEditor";
import BankDrawer from "./BankDrawer";
import { businessTestWorkspace } from "./testFixtures";
import { formatMoney } from "./format";

const api = vi.hoisted(() => ({ fetch: vi.fn(), create: vi.fn(), connect: vi.fn() }));
vi.mock("./api", () => ({ fetchBusinessWorkspace: api.fetch, createBusinessInvoice: api.create, connectBusinessBank: api.connect, disconnectBusinessBank: vi.fn(), syncBusinessBank: vi.fn(), downloadBusinessDocument: vi.fn(), allocateBusinessPayment: vi.fn(), reverseBusinessAllocation: vi.fn() }));
beforeEach(() => { api.fetch.mockResolvedValue(businessTestWorkspace()); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });
function page(path = "/business?period=2026-10") { return render(<MemoryRouter initialEntries={[path]}><BusinessPage /></MemoryRouter>); }

describe("Business workspace", () => {
  it("defaults to the latest current invoice period rather than a future archive period", async () => {
    const data = businessTestWorkspace();
    data.periods.push("2026-12");
    data.invoices[1].period = "2026-12";
    api.fetch.mockResolvedValue(data);
    page("/business");
    await waitFor(() => expect(api.fetch).toHaveBeenCalledWith("2026-10", undefined, expect.any(AbortSignal)));
    expect(api.fetch.mock.calls.some(([period]) => period === "2026-12")).toBe(false);
  });
  it("shows unknown payment evidence separately from zero and excludes historical charges", async () => {
    page();
    const summary = await screen.findByRole("region", { name: "Финансовая сводка" });
    expect(within(summary).getByText("Нет данных")).toBeInTheDocument();
    expect(within(summary).queryByText(formatMoney(0))).not.toBeInTheDocument();
    expect(within(summary).getAllByText(formatMoney(123456).replace(/\s/g, " "))).toHaveLength(2);
    expect(within(summary).queryByText(formatMoney(999999))).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Счета и акты/ }));
    expect(await screen.findByRole("button", { name: "Счёт № 101" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Счёт № 100" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch", { name: "Архивные версии" }));
    expect(screen.getByRole("button", { name: "Счёт № 100" })).toBeInTheDocument();
  }, 15_000);
  it("opens payer history across all periods and keeps complete payer metadata", async () => {
    page();
    fireEvent.click(await screen.findByRole("button", { name: "ООО «Тестовый склад»" }));
    await waitFor(() => expect(api.fetch).toHaveBeenCalledWith("all", "payer-1", expect.any(AbortSignal)));
    expect(await screen.findByRole("heading", { name: "ООО «Тестовый склад»" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Все плательщики/ })).toBeInTheDocument();
  }, 15_000);
  it("keeps imported statement evidence visible when the live token is disconnected", async () => {
    const data = businessTestWorkspace();
    data.bank = { ...data.bank, lastSyncedAt: "2026-11-03T10:00:00Z", coverageStart: "2026-01-01", coverageEnd: "2026-11-03", accountCount: 2 };
    data.summary.paidMinor = 10000;
    api.fetch.mockResolvedValue(data);
    page();
    expect(await screen.findByText("Выписки Точки загружены")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Подключить для обновления" })).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Финансовая сводка" })).getByText(formatMoney(10000))).toBeInTheDocument();
  });
  it("labels all-period payment history separately from selected-period receipts", async () => {
    const data = businessTestWorkspace();
    data.payments = [{ id: "payment-october", date: "2026-10-28", amountMinor: 10000, currency: "RUB", counterpartyId: "payer-1", counterpartyName: "Тестовый плательщик", payerInn: "0000000001", description: "Поступление в октябре", accountLabel: "Тестовый счёт", source: "synthetic", allocatedMinor: 0, unallocatedMinor: 10000, allocations: [] }];
    api.fetch.mockResolvedValue(data);
    page("/business?period=2026-11&view=payments");
    expect(await screen.findByRole("heading", { name: "Все поступления" })).toBeInTheDocument();
    expect(screen.getByText(/История за все периоды: выбранный месяц счетов не ограничивает список/)).toBeInTheDocument();
    expect(screen.getByText("28.10.2026")).toBeInTheDocument();
    const selectedPeriodReceipts = screen.getByText("Поступило за выбранный период").parentElement!;
    expect(within(selectedPeriodReceipts).getByText(formatMoney(0))).toBeInTheDocument();
  });
  it("shows a failed read as an error and can retry", async () => {
    api.fetch.mockRejectedValueOnce(new Error("network"));
    page();
    expect(await screen.findByText(/Не удалось загрузить данные/)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Финансовая сводка" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Повторить" }));
    expect(await screen.findByRole("region", { name: "Финансовая сводка" })).toBeInTheDocument();
  });
});

describe("Business mutation forms", () => {
  it("preserves the invoice draft after a rejected create and sends exact kopecks", async () => {
    api.create.mockRejectedValue(new ApiError(409, "Счёт за этот период уже существует", ""));
    render(<InvoiceEditor open workspace={businessTestWorkspace()} onClose={vi.fn()} onCreated={vi.fn()} />);
    const price = await screen.findByLabelText("Цена, ₽");
    fireEvent.change(price, { target: { value: "12,34" } });
    fireEvent.click(screen.getByRole("button", { name: "Создать счёт" }));
    expect(await screen.findByText("Счёт за этот период уже существует")).toBeInTheDocument();
    expect(price).toHaveValue("12,34");
    expect(api.create.mock.calls[0][0].items[0]).toMatchObject({ priceMinor: 1234, amountMinor: 1234 });
    expect(api.create.mock.calls[0][0].provider).toBe("local");
    expect(screen.getByRole("button", { name: "Создать счёт" })).toBeEnabled();
  });
  it("clears a bank token after an attempt and does not persist it in browser storage", async () => {
    api.connect.mockRejectedValue(new ApiError(403, "Недостаточно разрешений", ""));
    render(<BankDrawer open bank={businessTestWorkspace().bank} period="2026-10" onClose={vi.fn()} onChanged={vi.fn()} />);
    const input = screen.getByLabelText("API-токен");
    fireEvent.change(input, { target: { value: "synthetic-bank-secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Подключить Точку" }));
    expect(await screen.findByText("Недостаточно разрешений")).toBeInTheDocument();
    expect(input).toHaveValue("");
    expect(api.connect).toHaveBeenCalledWith("synthetic-bank-secret");
    expect(Object.values(localStorage)).not.toContain("synthetic-bank-secret");
  });
  it("shows a definitive HTTP 400 bank rejection and can retry the preserved draft as a local PDF", async () => {
    const data = businessTestWorkspace();
    data.bank.connected = true;
    const onCreated = vi.fn();
    api.create.mockRejectedValueOnce(new ApiError(400, "Точка отклонила создание счёта", "")).mockResolvedValueOnce(data.invoices[0]);
    render(<InvoiceEditor open workspace={data} onClose={vi.fn()} onCreated={onCreated} />);
    const method = await screen.findByLabelText("Способ создания");
    fireEvent.mouseDown(method);
    fireEvent.click(await screen.findByText("Через Точку"));
    fireEvent.change(screen.getByLabelText("Цена, ₽"), { target: { value: "45,67" } });
    fireEvent.change(screen.getByLabelText("Основание"), { target: { value: "Сохранённое основание" } });
    fireEvent.click(screen.getByRole("button", { name: "Создать счёт" }));
    expect(await screen.findByText("Точка отклонила создание счёта")).toBeInTheDocument();
    expect(screen.queryByText(/Результат создания в банке не подтверждён/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Цена, ₽")).toHaveValue("45,67");
    expect(screen.getByLabelText("Основание")).toHaveValue("Сохранённое основание");
    expect(screen.getByRole("button", { name: "Создать счёт" })).toBeEnabled();
    expect(onCreated).not.toHaveBeenCalled();
    fireEvent.mouseDown(method);
    fireEvent.click(await screen.findByText("PDF в Бизнесе"));
    fireEvent.click(screen.getByRole("button", { name: "Создать счёт" }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(data.invoices[0]));
    expect(api.create).toHaveBeenCalledTimes(2);
    const firstRequest = api.create.mock.calls[0][0];
    expect(firstRequest).toMatchObject({ provider: "tochka", basis: "Сохранённое основание", items: [expect.objectContaining({ priceMinor: 4567, amountMinor: 4567 })] });
    expect(api.create.mock.calls[1][0]).toEqual({ ...firstRequest, provider: "local" });
  });
  it.each([403, 502])("preserves a bank invoice draft after HTTP %s and blocks an uncertain resubmit", async status => {
    const data = businessTestWorkspace();
    data.bank.connected = true;
    api.create.mockRejectedValue(new ApiError(status, "Банк отклонил запрос", ""));
    render(<InvoiceEditor open workspace={data} onClose={vi.fn()} onCreated={vi.fn()} />);
    const method = await screen.findByLabelText("Способ создания");
    fireEvent.mouseDown(method);
    fireEvent.click(await screen.findByText("Через Точку"));
    fireEvent.change(screen.getByLabelText("Цена, ₽"), { target: { value: "45,67" } });
    fireEvent.click(screen.getByRole("button", { name: "Создать счёт" }));
    await waitFor(() => expect(api.create).toHaveBeenCalled());
    await screen.findByText(status === 403 ? "Банк отклонил запрос" : /Результат создания в банке не подтверждён/);
    expect(screen.getByLabelText("Цена, ₽")).toHaveValue("45,67");
    expect(api.create.mock.calls[0][0].provider).toBe("tochka");
    if (status === 502) expect(screen.getByRole("button", { name: "Создать счёт" })).toBeDisabled();
    else expect(screen.getByRole("button", { name: "Создать счёт" })).toBeEnabled();
  });
});
