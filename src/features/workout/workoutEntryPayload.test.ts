import { describe, expect, it } from "vitest";
import { upsertRequestFromValues } from "./workoutEntryPayload";

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
});
