import { describe, expect, it } from "vitest";
import { selectionToZoomDomain } from "./chartZoom";

describe("selectionToZoomDomain", () => {
  it("maps a reversed drag to narrower time and value domains", () => {
    expect(selectionToZoomDomain(
      { x: 300, y: 150 },
      { x: 100, y: 50 },
      { width: 400, height: 200 },
      { x: [0, 1_000], y: [0, 100] },
    )).toEqual({ x: [250, 750], y: [25, 75] });
  });

  it("ignores a click or tiny accidental drag", () => {
    expect(selectionToZoomDomain(
      { x: 100, y: 100 },
      { x: 105, y: 105 },
      { width: 400, height: 200 },
      { x: [0, 1_000], y: [0, 100] },
    )).toBeNull();
  });
});
