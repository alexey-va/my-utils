import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CounterpartyLedger } from "./BusinessOverview";
import { businessTestPayment, businessTestWorkspace } from "./testFixtures";

const api = vi.hoisted(() => ({ fetch: vi.fn(), status: vi.fn() }));
vi.mock("./api", () => ({ fetchBusinessWorkspace: api.fetch, setBusinessCounterpartyStatus: api.status }));

beforeEach(() => {
  api.fetch.mockReset().mockResolvedValue(businessTestWorkspace());
  api.status.mockReset().mockResolvedValue(undefined);
});
afterEach(cleanup);

function ledger(overrides: Partial<ReturnType<typeof businessTestWorkspace>["counterparties"][number]> = {}) {
  const payer = { ...businessTestWorkspace().counterparties[0], ...overrides };
  const onOpen = vi.fn();
  const onChanged = vi.fn();
  render(<CounterpartyLedger rows={[payer]} previousPeriod="2026-10" onOpen={onOpen} onChanged={onChanged} />);
  return { payer, onOpen, onChanged };
}

describe("Previous-month document attention", () => {
  it.each([
    [{ invoice: false, act: false }, "Октябрь 2026: нет счёта и акта"],
    [{ invoice: true, act: false }, "Октябрь 2026: нет акта"],
    [{ invoice: false, act: true }, "Октябрь 2026: нет счёта"],
  ] as const)("names the exact missing documents from server coverage %j", (previousPeriodDocuments, expected) => {
    ledger({ previousPeriodDocuments, inactive: false });
    expect(screen.getByText(expected)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ООО «Тестовый склад»" }).closest('[role="row"]')).toHaveClass("business-ledger__row--missing-documents");
  });

  it("keeps inactive payer balances visible without requiring documents", () => {
    ledger({ inactive: true, previousPeriodDocuments: { invoice: false, act: false } });
    expect(screen.getByText("Неактивен")).toBeInTheDocument();
    expect(screen.queryByText(/Октябрь 2026: нет/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ООО «Тестовый склад»" })).toBeInTheDocument();
  });

  it("does not invent a warning for older responses without server coverage", () => {
    ledger({ inactive: undefined, previousPeriodDocuments: undefined });
    expect(screen.queryByText(/Октябрь 2026: нет/)).not.toBeInTheDocument();
  });
});

describe("Inline payer history", () => {
  it("expands independently from full details, loads all periods and collapses accessibly", async () => {
    const { onOpen } = ledger();
    const toggle = screen.getByRole("button", { name: "Краткая история ООО «Тестовый склад»" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(api.fetch).not.toHaveBeenCalled();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById(toggle.getAttribute("aria-controls")!)).toBeInTheDocument();
    expect(await screen.findByText("Выставлен 01.10.2026")).toBeInTheDocument();
    expect(api.fetch).toHaveBeenCalledWith("all", "payer-1", expect.any(AbortSignal));
    expect(onOpen).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Открыть ООО «Тестовый склад»" }));
    expect(onOpen).toHaveBeenCalledWith("payer-1");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("region", { name: "Последние счета" })).not.toBeInTheDocument();
  });

  it("shows the three latest current invoices and actual receipt dates, with legacy payments labelled", async () => {
    const data = businessTestWorkspace();
    const invoice = data.invoices[0];
    data.invoices = [
      ...[1, 4, 2, 3].map(day => ({ ...invoice, id: `invoice-${day}`, number: String(day), issueDate: `2026-11-0${day}` })),
      { ...invoice, id: "archive", number: "ARCHIVE", issueDate: "2026-12-01", isCurrent: false },
      { ...invoice, id: "foreign", counterpartyId: "another-payer", number: "FOREIGN", issueDate: "2026-12-01" },
    ];
    data.payments = [1, 4, 2, 3].map(day => businessTestPayment({ id: `payment-${day}`, date: `2026-11-0${day}`, classification: day === 4 ? "historical" : "rental" }));
    data.payments.push(businessTestPayment({ id: "foreign-payment", counterpartyId: "another-payer", date: "2026-12-01" }));
    data.bank = { ...data.bank, lastSyncedAt: "2026-11-05T10:00:00Z", coverageStart: "2026-01-01", coverageEnd: "2026-11-05" };
    api.fetch.mockResolvedValue(data);
    ledger();
    fireEvent.click(screen.getByRole("button", { name: /Краткая история/ }));
    const invoices = within(await screen.findByRole("region", { name: "Последние счета" }));
    const payments = within(screen.getByRole("region", { name: "Последние поступления" }));
    expect(invoices.getAllByRole("listitem").map(item => item.textContent)).toEqual([
      expect.stringContaining("Счёт № 4Выставлен 04.11.2026"),
      expect.stringContaining("Счёт № 3Выставлен 03.11.2026"),
      expect.stringContaining("Счёт № 2Выставлен 02.11.2026"),
    ]);
    expect(invoices.getByText("3 из 4")).toBeInTheDocument();
    expect(payments.getAllByRole("listitem")).toHaveLength(3);
    expect(payments.getByText("Поступление 04.11.2026")).toBeInTheDocument();
    expect(payments.getByText("Оплата прошлых периодов")).toBeInTheDocument();
    expect(payments.getByText("Выписки: 01.01.2026 — 05.11.2026. Обновлены 05.11.2026.")).toBeInTheDocument();
    expect(screen.queryByText(/FOREIGN|ARCHIVE|Поступление 01.12.2026/)).not.toBeInTheDocument();
  });

  it("retries a failed history read and distinguishes missing statements from no payment", async () => {
    api.fetch.mockRejectedValueOnce(new Error("offline"));
    ledger();
    fireEvent.click(screen.getByRole("button", { name: /Краткая история/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Не удалось загрузить историю плательщика.");
    fireEvent.click(screen.getByRole("button", { name: "Повторить загрузку истории" }));
    expect(await screen.findByText("В загруженных выписках поступления не найдены.")).toBeInTheDocument();
    expect(screen.getByText(/Отсутствие поступлений не подтверждает отсутствие оплаты/)).toBeInTheDocument();
  });

  it("shows archive-only history with distinct service ranges, latest revisions and the same three-record limit", async () => {
    const data = businessTestWorkspace();
    const archived = { ...data.invoices[0], isCurrent: false, status: "archived" as const, providerState: "imported", period: "2030-02", periodStart: "2030-02-01", periodEnd: "2030-02-28" };
    data.invoices = [
      { ...archived, id: "month-old", number: "OLD-MONTH", revision: 1, issueDate: "2030-02-04" },
      { ...archived, id: "month-latest", number: "302", revision: 2, issueDate: "2030-02-03", periodStart: "", periodEnd: "" },
      { ...archived, id: "range-old", number: "OLD-RANGE", revision: 1, issueDate: "2030-08-05", periodEnd: "2030-08-31" },
      { ...archived, id: "range-latest", number: "308", revision: 2, issueDate: "2030-08-03", periodEnd: "2030-08-31" },
      { ...archived, id: "january", number: "301", issueDate: "2030-01-03", period: "2030-01", periodStart: "2030-01-01", periodEnd: "2030-01-31" },
      { ...archived, id: "december", number: "212", issueDate: "2029-12-03", period: "2029-12", periodStart: "2029-12-01", periodEnd: "2029-12-31" },
      { ...archived, id: "foreign", counterpartyId: "another-payer", number: "FOREIGN", isCurrent: true },
    ];
    api.fetch.mockResolvedValue(data);
    ledger({ inactive: true });
    fireEvent.click(screen.getByRole("button", { name: /Краткая история/ }));
    const invoices = within(await screen.findByRole("region", { name: "Последние счета" }));
    expect(invoices.getAllByRole("listitem").map(item => item.textContent)).toEqual([
      expect.stringContaining("Архивный счёт № 308Выставлен 03.08.2030"),
      expect.stringContaining("Архивный счёт № 302Выставлен 03.02.2030"),
      expect.stringContaining("Архивный счёт № 301Выставлен 03.01.2030"),
    ]);
    expect(invoices.getByText("За 01.02.2030 — 31.08.2030")).toBeInTheDocument();
    expect(invoices.getByText("3 из 4")).toBeInTheDocument();
    expect(invoices.getByText("Архивные документы не входят в текущий баланс.")).toBeInTheDocument();
    expect(invoices.queryByText(/OLD-MONTH|OLD-RANGE|FOREIGN|Счетов пока нет/)).not.toBeInTheDocument();
  });

  it("does not present an uncertain bank request as an issued invoice", async () => {
    const data = businessTestWorkspace();
    data.invoices = [{ ...data.invoices[0], provider: "tochka", providerState: "unknown", issueDate: "2026-10-01", createdAt: "2026-11-03T10:00:00Z" }];
    api.fetch.mockResolvedValue(data);
    ledger();
    fireEvent.click(screen.getByRole("button", { name: /Краткая история/ }));
    expect(await screen.findByText("Создание не подтверждено")).toBeInTheDocument();
    expect(screen.getByText("Дата запроса 03.11.2026")).toBeInTheDocument();
    expect(screen.queryByText("Выставлен 01.10.2026")).not.toBeInTheDocument();
  });

  it("aborts collapsed history and ignores a late response for another payer", async () => {
    let resolveHistory!: (value: ReturnType<typeof businessTestWorkspace>) => void;
    api.fetch.mockImplementationOnce(() => new Promise(resolve => { resolveHistory = resolve; }));
    const data = businessTestWorkspace();
    render(<CounterpartyLedger rows={[data.counterparties[0], { ...data.counterparties[0], id: "payer-2", name: "Другой плательщик" }]} onOpen={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Краткая история ООО «Тестовый склад»" }));
    const signal = api.fetch.mock.calls[0][2] as AbortSignal;
    fireEvent.click(screen.getByRole("button", { name: "Краткая история Другой плательщик" }));
    expect(signal.aborted).toBe(true);
    await act(async () => { resolveHistory(data); });
    expect(screen.getByRole("button", { name: "Краткая история Другой плательщик" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.queryByText("Счёт № 101")).not.toBeInTheDocument();
  });
});

describe("Payer activity", () => {
  it.each([false, true])("saves inactive=%s reversibly and refreshes only after confirmation", async inactive => {
    const { onChanged } = ledger({ inactive });
    fireEvent.click(screen.getByRole("button", { name: /Краткая история/ }));
    fireEvent.click(screen.getByRole("button", { name: inactive ? "Сделать активным" : "Отметить неактивным" }));
    await waitFor(() => expect(api.status).toHaveBeenCalledWith("payer-1", !inactive));
    await waitFor(() => expect(onChanged).toHaveBeenCalledOnce());
  });

  it("preserves the active status and exposes retry when saving is rejected", async () => {
    api.status.mockRejectedValueOnce(new Error("rejected"));
    const { onChanged } = ledger({ inactive: false });
    fireEvent.click(screen.getByRole("button", { name: /Краткая история/ }));
    fireEvent.click(screen.getByRole("button", { name: "Отметить неактивным" }));
    expect(await screen.findByText("Не удалось изменить статус. Повторите попытку.")).toBeInTheDocument();
    expect(screen.getByText("Активный плательщик")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Отметить неактивным" })).toBeEnabled();
    expect(onChanged).not.toHaveBeenCalled();
  });
});
