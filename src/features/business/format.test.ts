import { describe, expect, it } from "vitest";
import { formatInvoicePeriod, hasPeriodCoverage, lineAmountMinor, parseMoneyMinor } from "./format";

describe("Business invoice periods", () => {
  it("keeps monthly labels and shows the full actual range for cumulative invoices", () => {
    expect(formatInvoicePeriod({ period: "2030-02", periodStart: "2030-02-01", periodEnd: "2030-08-31" })).toBe("01.02.2030 — 31.08.2030");
    expect(formatInvoicePeriod({ period: "2030-10", periodStart: "2030-10-01", periodEnd: "2030-10-31" })).toBe("Октябрь 2030");
    expect(formatInvoicePeriod({ period: "2030-10", periodStart: "", periodEnd: "" })).toBe("Октябрь 2030");
  });
});

describe("Business monetary inputs", () => {
  it("parses decimal strings without floating point rounding", () => {
    expect(parseMoneyMinor("1 234,56")).toBe(123456);
    expect(parseMoneyMinor("0.29")).toBe(29);
    expect(parseMoneyMinor("0")).toBe(0);
    expect(parseMoneyMinor("90071992547409.91")).toBe(Number.MAX_SAFE_INTEGER);
    for (const value of ["1.001", "-1", "Infinity", "1e3", "90071992547409.92", ""]) expect(parseMoneyMinor(value)).toBeNull();
  });
  it("previews decimal quantities with half-up kopeck rounding", () => {
    expect(lineAmountMinor(29, "3")).toBe(87);
    expect(lineAmountMinor(1, "0.5")).toBe(1);
    expect(lineAmountMinor(1, "0.499999")).toBe(0);
    expect(lineAmountMinor(12345, "1,25")).toBe(15431);
    expect(lineAmountMinor(Number.MAX_SAFE_INTEGER, "2")).toBeNull();
    expect(lineAmountMinor(100, "0")).toBeNull();
  });
  it("does not treat unrelated or partial bank coverage as a known zero", () => {
    expect(hasPeriodCoverage("2026-10", "2026-01-01", "2026-11-03")).toBe(true);
    expect(hasPeriodCoverage("2026-11", "2026-01-01", "2026-11-03")).toBe(false);
    expect(hasPeriodCoverage("2026-10", "2026-10-02", "2026-10-31")).toBe(false);
    expect(hasPeriodCoverage("all", "2026-01-01", "2026-11-03")).toBe(false);
  });
});
