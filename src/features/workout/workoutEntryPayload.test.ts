import { describe, expect, it } from "vitest";
import { upsertRequestFromCell, upsertRequestFromValues } from "./workoutEntryPayload";

describe("workout entry payload", () => {
  it("preserves fractional plate increments", () => {
    expect(
      upsertRequestFromValues(
        "00000000-0000-0000-0000-000000000001",
        "2026-07-25",
        72.5,
        "10/10/9/9",
      ),
    ).toMatchObject({
      weightKg: 72.5,
      setCount: 4,
      repsPerSet: 9,
      maxReps: 10,
      setReps: [10, 10, 9, 9],
    });
  });

  it("normalizes arbitrary input to quarter kilograms", () => {
    expect(
      upsertRequestFromValues(
        "00000000-0000-0000-0000-000000000001",
        "2026-07-25",
        72.61,
        "8",
      ).weightKg,
    ).toBe(72.5);
  });

  it("preserves three working sets plus an equal max set on edit", () => {
    expect(
      upsertRequestFromCell(
        "00000000-0000-0000-0000-000000000001",
        "2026-08-14",
        {
          weightKg: 86,
          setCount: 3,
          repsPerSet: 10,
          maxReps: 10,
          setReps: [10, 10, 10, 10],
          display: "86  3×10  (10)",
        },
      ),
    ).toMatchObject({
      setCount: 3,
      repsPerSet: 10,
      maxReps: 10,
      setReps: [10, 10, 10, 10],
    });
  });
});
