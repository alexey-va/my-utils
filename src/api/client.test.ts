import { afterEach, describe, expect, it, vi } from "vitest";
import { AUTH_TOKEN_KEY } from "../auth/session";
import { apiRequest } from "./client";
import { ApiError } from "./errors";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiRequest", () => {
  it("uses the server JSON message and keeps the raw response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Target workout cell is not empty" }), {
          status: 409,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    await expect(apiRequest("/api/workouts/grid")).rejects.toMatchObject({
      status: 409,
      message: "Target workout cell is not empty",
      body: '{"message":"Target workout cell is not empty"}',
    } satisfies Partial<ApiError>);
  });

  it("attaches the stored bearer token unless auth is skipped", async () => {
    localStorage.setItem(AUTH_TOKEN_KEY, "signed-token");
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest("/api/auth/me");
    await apiRequest("/api/auth/login", { skipAuth: true });

    const firstHeaders = fetchMock.mock.calls[0][1].headers as Headers;
    const secondHeaders = fetchMock.mock.calls[1][1].headers as Headers;
    expect(firstHeaders.get("Authorization")).toBe("Bearer signed-token");
    expect(secondHeaders.get("Authorization")).toBeNull();
  });
});
