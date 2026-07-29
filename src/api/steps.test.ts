import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchHealthStepsHistory } from "./steps";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchHealthStepsHistory", () => {
  it("loads the complete history by default", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          days: [],
          todaySteps: null,
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await fetchHealthStepsHistory();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/health/steps",
      expect.objectContaining({ method: "GET" }),
    );
  });
});
