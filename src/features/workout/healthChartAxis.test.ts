import { describe, expect, it } from "vitest";
import { HEALTH_CHART_Y_TICK_COUNT } from "./healthChartAxis";

describe("health chart Y axis", () => {
  it("requests six labelled Y-axis ticks", () => {
    expect(HEALTH_CHART_Y_TICK_COUNT).toBe(6);
  });
});
