import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchHealthBodyWeightHistory } from "./weight";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchHealthBodyWeightHistory", () => {
  it("loads the complete history by default", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          days: [],
          latestWeightKg: null,
          latestDate: null,
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await fetchHealthBodyWeightHistory();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/health/weight",
      expect.objectContaining({ method: "GET" }),
    );
  });
});
