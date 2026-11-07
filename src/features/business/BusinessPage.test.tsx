import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/errors";
import BusinessPage from "./BusinessPage";
import InvoiceEditor from "./InvoiceEditor";
import BankDrawer from "./BankDrawer";
import { InvoiceDetailDrawer, PaymentDetailDrawer } from "./BusinessDetails";
import { InvoiceLedger, PaymentLedger } from "./BusinessLedgers";
import { businessTestPayment, businessTestWorkspace } from "./testFixtures";
import { formatMoney } from "./format";

const api = vi.hoisted(() => ({ fetch: vi.fn(), create: vi.fn(), connect: vi.fn() }));
vi.mock("./api", () => ({ fetchBusinessWorkspace: api.fetch, createBusinessInvoice: api.create, connectBusinessBank: api.connect, disconnectBusinessBank: vi.fn(), syncBusinessBank: vi.fn(), downloadBusinessDocument: vi.fn(), allocateBusinessPayment: vi.fn(), reverseBusinessAllocation: vi.fn() }));
beforeEach(() => { api.fetch.mockResolvedValue(businessTestWorkspace()); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });
function page(path = "/business?period=2026-10") { return render(<MemoryRouter initialEntries={[path]}><BusinessPage /></MemoryRouter>); }

describe("Business workspace", () => {
  it("shows a cumulative archive's full service range in the ledger and invoice details", async () => {
    const data = businessTestWorkspace();
    const archive = { ...data.invoices[1], period: "2030-02", periodStart: "2030-02-01", periodEnd: "2030-08-31" };
    data.invoices[1] = archive;
    api.fetch.mockResolvedValue(data);
    render(<InvoiceLedger rows={[archive]} counterparties={data.counterparties} onOpen={vi.fn()} />);
    expect(within(screen.getByRole("table", { name: "Счета и акты" })).getByText("01.02.2030 — 31.08.2030")).toBeInTheDocument();
    await act(async () => { render(<InvoiceDetailDrawer invoice={archive} onClose={vi.fn()} onChanged={vi.fn()} />); });
    expect(within(screen.getByRole("dialog")).getByText("01.02.2030 — 31.08.2030")).toBeInTheDocument();
    expect(screen.queryByText("Февраль 2030")).not.toBeInTheDocument();
  });
  it("opens the combined September and October balance without redirecting to a single month", async () => {
    const data = businessTestWorkspace();
    data.periods.push("2026-12");
    data.invoices[1].period = "2026-12";
    data.invoices.push({ ...data.invoices[0], id: "invoice-september", number: "99", period: "2026-09" });
    data.summary = { ...data.summary, invoicedMinor: 246912, outstandingMinor: 246912, invoiceCount: 2, unreviewedInvoiceCount: 2 };
    data.counterparties[0] = { ...data.counterparties[0], invoicedMinor: 246912, outstandingMinor: 246912, invoiceCount: 2, unreviewedCount: 2 };
    api.fetch.mockResolvedValue(data);
    page("/business");
    const summary = await screen.findByRole("region", { name: "Финансовая сводка" });
    expect(screen.getByRole("heading", { name: "Расчёты за все периоды" })).toBeInTheDocument();
    expect(within(summary).getAllByText(formatMoney(246912).replace(/\s/g, " "))).toHaveLength(2);
    expect(api.fetch).toHaveBeenCalledWith("all", undefined, expect.any(AbortSignal));
    expect(api.fetch.mock.calls.every(([period]) => period === "all")).toBe(true);
    const months = within(screen.getByRole("navigation", { name: "Месяцы учёта" }));
    expect(months.getByRole("button", { name: "Сентябрь 2026" })).toBeInTheDocument();
    expect(months.getByRole("button", { name: "Октябрь 2026" })).toBeInTheDocument();
    expect(months.queryByRole("button", { name: "Декабрь 2026" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Счета и акты/ }));
    expect(await screen.findByRole("button", { name: "Счёт № 99" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Счёт № 101" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Счёт № 100" })).not.toBeInTheDocument();
  }, 15_000);
  it("makes an October deep link visibly monthly and provides September and all-period actions", async () => {
    page("/business?period=2026-10&view=payers");
    await screen.findByRole("region", { name: "Финансовая сводка" });
    expect(screen.getByRole("heading", { name: "Расчёты за октябрь 2026" })).toBeInTheDocument();
    expect(screen.getByText(/Начисления, оплаты и остаток по счетам — только за выбранный месяц/)).toBeInTheDocument();
    const periods = within(screen.getByRole("navigation", { name: "Месяцы учёта" }));
    expect(periods.getByRole("button", { name: "Октябрь 2026" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(periods.getByRole("button", { name: "Сентябрь 2026" }));
    await waitFor(() => expect(api.fetch).toHaveBeenCalledWith("2026-09", undefined, expect.any(AbortSignal)));
    expect(screen.getByRole("heading", { name: "Расчёты за сентябрь 2026" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Показать все периоды" }));
    await waitFor(() => expect(api.fetch).toHaveBeenCalledWith("all", undefined, expect.any(AbortSignal)));
    expect(screen.getByRole("heading", { name: "Расчёты за все периоды" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Показать все периоды" })).not.toBeInTheDocument();
  }, 15_000);
  it("shows unknown payment evidence separately from zero and excludes historical charges", async () => {
    page();
    const summary = await screen.findByRole("region", { name: "Финансовая сводка" });
    expect(within(summary).getAllByText("Нет данных")).toHaveLength(2);
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
    data.payments = [{ id: "payment-october", date: "2026-10-28", amountMinor: 10000, currency: "RUB", counterpartyId: "payer-1", counterpartyName: "Тестовый плательщик", payerInn: "0000000001", description: "Поступление в октябре", accountLabel: "Тестовый счёт", source: "synthetic", classification: "rental", allocatedMinor: 0, unallocatedMinor: 10000, advanceMinor: 0, allocations: [] }];
    api.fetch.mockResolvedValue(data);
    page("/business?period=2026-11&view=payments");
    expect(await screen.findByRole("heading", { name: "Поступления" })).toBeInTheDocument();
    expect(screen.getByText(/Поступления за все периоды. Выбранный месяц ограничивает только сводку/)).toBeInTheDocument();
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

describe("Business advances and payment history", () => {
  it("keeps advances separate from invoice remainder and does not request allocation for a recognized advance", async () => {
    const data = businessTestWorkspace();
    data.summary = { ...data.summary, invoicedMinor: 200000, paidMinor: 120000, outstandingMinor: 80000, unallocatedMinor: 30000, advanceMinor: 30000, unreviewedInvoiceCount: 0 };
    data.counterparties[0] = { ...data.counterparties[0], invoicedMinor: 200000, paidMinor: 120000, outstandingMinor: 80000, advanceMinor: 30000, unreviewedCount: 0 };
    api.fetch.mockResolvedValue(data);
    page("/business");
    const summary = await screen.findByRole("region", { name: "Финансовая сводка" });
    expect(within(summary).getByText(formatMoney(80000))).toBeInTheDocument();
    expect(within(summary).getByText(formatMoney(30000))).toBeInTheDocument();
    const payers = within(screen.getByRole("table", { name: "Плательщики" }));
    expect(payers.getByRole("columnheader", { name: "Аванс" })).toBeInTheDocument();
    expect(payers.getByText(formatMoney(80000))).toBeInTheDocument();
    expect(payers.getByText(formatMoney(30000))).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Распределить" })).not.toBeInTheDocument();
  });
  it("shows all receipts chronologically without switches while keeping historical cash and advances separate", async () => {
    const data = businessTestWorkspace();
    data.summary = { ...data.summary, receivedMinor: 90000, historicalReceivedMinor: 20000, unallocatedMinor: 55000, advanceMinor: 30000 };
    data.payments = [
      businessTestPayment({ id: "advance", counterpartyName: "Тестовый аванс", amountMinor: 30000, unallocatedMinor: 30000, advanceMinor: 30000 }),
      businessTestPayment({ id: "review", counterpartyName: "Тестовое распределение", date: "2026-10-19", amountMinor: 40000, allocatedMinor: 30000, unallocatedMinor: 10000 }),
      businessTestPayment({ id: "historical", counterpartyName: "Тестовая история", date: "2026-10-25", amountMinor: 20000, classification: "historical", historicalInvoiceId: "invoice-old", unallocatedMinor: 0 }),
      businessTestPayment({ id: "outside", counterpartyName: "Тестовое раннее поступление", amountMinor: 10000, date: "2026-08-20", classification: "outside_period", unallocatedMinor: 0 }),
      businessTestPayment({ id: "unknown", counterpartyId: "", counterpartyName: "Тестовое неизвестное поступление", date: "2026-10-28", classification: "unclassified", amountMinor: 15000, unallocatedMinor: 15000 }),
      businessTestPayment({ id: "allocated", counterpartyName: "Тестовое распределённое поступление", date: "2026-10-18", amountMinor: 5000, allocatedMinor: 5000, unallocatedMinor: 0 }),
    ];
    api.fetch.mockResolvedValue(data);
    page("/business?view=payments");
    expect(await screen.findByText("Поступило за месяцы учёта")).toBeInTheDocument();
    expect(screen.getByText("сентябрь 2026 · октябрь 2026")).toBeInTheDocument();
    const receipts = within(screen.getByText("Поступило за месяцы учёта").parentElement!);
    expect(receipts.getByText(formatMoney(90000))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Поступления 6/ })).toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Поступления" })).toBeInTheDocument();
    expect(screen.getByText("Оплата прошлых периодов")).toBeInTheDocument();
    expect(screen.getByText("До периода учёта")).toBeInTheDocument();
    expect(screen.getByText("Архивный счёт № 100")).toBeInTheDocument();
    expect(screen.getByText("Назначение требует проверки")).toBeInTheDocument();
    expect(screen.getByText(/Поступления до начала учёта за сентябрь 2026 · октябрь 2026: 200.*Не входят в текущие поступления/)).toBeInTheDocument();
    expect(receipts.getByText(formatMoney(90000))).toBeInTheDocument();
    expect(screen.queryByText(/В том числе за прошлые периоды/)).not.toBeInTheDocument();
    const payments = within(screen.getByRole("table", { name: "Поступления" }));
    expect(payments.getAllByRole("row").slice(1).map(row => within(row).getAllByRole("button")[0].textContent)).toEqual([
      "Тестовое неизвестное поступление", "Тестовая история", "Тестовый аванс", "Тестовое распределение", "Тестовое распределённое поступление", "Тестовое раннее поступление",
    ]);
    expect(screen.getByText("1–6 из 6")).toBeInTheDocument();
    expect(within(screen.getAllByText("Требует распределения")[0].parentElement!).getByText(formatMoney(25000))).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Поиск в бизнесе" }), { target: { value: "неизвестное" } });
    expect(payments.getByRole("button", { name: "Тестовое неизвестное поступление" })).toBeInTheDocument();
    expect(screen.getByText("1–1 из 1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Распределить" }));
    expect(screen.getByText("1–6 из 6")).toBeInTheDocument();
    expect(payments.getByRole("button", { name: "Тестовый аванс" })).toBeInTheDocument();
    expect(payments.getByRole("button", { name: "Тестовая история" })).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("navigation", { name: "Месяцы учёта" })).getByRole("button", { name: "Октябрь 2026" }));
    expect(await screen.findByText(/Поступления до начала учёта за октябрь 2026: 200.*Не входят в текущие поступления/)).toBeInTheDocument();
    expect(screen.queryByText(/Поступления до начала учёта за сентябрь/)).not.toBeInTheDocument();
  }, 15_000);
  it("keeps a historical invoice association understandable when the invoice is outside the selected month", async () => {
    const data = businessTestWorkspace();
    const payment = businessTestPayment({ classification: "historical", historicalInvoiceId: "invoice-old", unallocatedMinor: 0 });
    data.payments = [payment];
    api.fetch.mockResolvedValue(data);
    render(<PaymentLedger rows={[payment]} invoices={[]} onOpen={vi.fn()} />);
    expect(screen.getByText("Связан с архивным счётом")).toBeInTheDocument();
    await act(async () => { render(<PaymentDetailDrawer payment={payment} onClose={vi.fn()} onChanged={vi.fn()} />); });
    const details = within(screen.getByRole("dialog"));
    expect(details.getByText("Архивный счёт")).toBeInTheDocument();
    expect(details.getByText("№ 100 от 01.10.2026")).toBeInTheDocument();
    expect(details.queryByRole("button", { name: "Зачесть оплату" })).not.toBeInTheDocument();
  });
  it.each(["historical", "outside_period"] as const)("keeps %s payment details readable without current-invoice allocation controls", async classification => {
    const data = businessTestWorkspace();
    const payment = businessTestPayment({ classification, unallocatedMinor: 0, date: classification === "outside_period" ? "2026-08-20" : "2026-10-20", description: "Тестовая аренда за сентябрь–декабрь" });
    data.payments = [payment];
    api.fetch.mockResolvedValue(data);
    await act(async () => { render(<PaymentDetailDrawer payment={payment} onClose={vi.fn()} onChanged={vi.fn()} />); });
    expect(screen.getByText(classification === "historical" ? "Оплата прошлых периодов" : "До периода учёта")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Зачесть оплату" })).not.toBeInTheDocument();
    expect(screen.queryByText("Не распределено")).not.toBeInTheDocument();
    expect(screen.queryByText("Требует распределения")).not.toBeInTheDocument();
    if (classification === "historical") {
      expect(screen.getByText("Поступление отнесено к истории до начала текущего учёта и не предлагается для зачёта по текущим счетам.")).toBeInTheDocument();
      expect(screen.getByText("Тестовая аренда за сентябрь–декабрь")).toBeInTheDocument();
      expect(screen.queryByText(/Назначение относится к прошлым периодам/)).not.toBeInTheDocument();
    }
  });
  it("keeps a recognized advance available for future manual allocation", async () => {
    const data = businessTestWorkspace();
    const payment = businessTestPayment({ advanceMinor: 50000 });
    data.payments = [payment];
    api.fetch.mockResolvedValue(data);
    await act(async () => { render(<PaymentDetailDrawer payment={payment} onClose={vi.fn()} onChanged={vi.fn()} />); });
    expect(screen.getByText("Аванс сохранён отдельно и доступен для зачёта по будущим счетам.")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Счёт для оплаты" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Зачесть оплату" })).toBeInTheDocument();
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
