import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendWorkoutPageView, workoutPageViewPayload } from "./workoutTelemetry";

describe("Workout visit telemetry", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("keeps a stable anonymous client and session marker", () => {
    const first = workoutPageViewPayload(window);
    const second = workoutPageViewPayload(window);

    expect(first.clientApp).toBe("my-utils");
    expect(first.events[0]).toMatchObject({
      type: "page_view",
      page: "/",
      uiMode: "workout",
    });
    expect(second.events[0].clientId).toBe(first.events[0].clientId);
    expect(second.events[0].sessionId).toBe(first.events[0].sessionId);
    expect(second.events[0].pageViewId).not.toBe(first.events[0].pageViewId);
  });

  it("posts only visit metadata and swallows transport failures", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));

    expect(() => sendWorkoutPageView({ windowRef: window, fetchImpl: fetchMock })).not.toThrow();
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    const body = String(request.body);
    expect(JSON.parse(body)).toMatchObject({
      clientApp: "my-utils",
      events: [{ type: "page_view", page: "/" }],
    });
    expect(body).not.toContain("Authorization");
    expect(request.credentials).toBe("omit");
  });
});
