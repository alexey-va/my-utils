import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AUTH_TOKEN_KEY,
  isLoggedIn,
  readStoredUser,
  storeSession,
} from "../auth/session";
import type { AuthUser } from "./types";
import { apiRequest } from "./client";
import { ApiError } from "./errors";

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

const admin: AuthUser = {
  id: "00000000-0000-0000-0000-000000000001",
  username: "freedeeml",
  email: "freedeeml@local.invalid",
  role: "ADMIN",
  mustChangePassword: false,
};

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

  it("refreshes an expired access token and retries the original request", async () => {
    storeSession(admin, "expired-token");
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (input === "/api/auth/refresh") {
        return new Response(JSON.stringify({ token: "fresh-token", user: admin }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      const headers = init?.headers as Headers;
      if (headers.get("Authorization") === "Bearer expired-token") {
        return new Response(null, { status: 401 });
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiRequest<{ ok: boolean }>("/api/admin/settings")).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe("/api/auth/refresh");
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: "POST", credentials: "include" });
    const retryHeaders = fetchMock.mock.calls[2][1]?.headers as Headers;
    expect(retryHeaders.get("Authorization")).toBe("Bearer fresh-token");
    expect(readStoredUser()).toEqual(admin);
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe("fresh-token");
  });

  it("shares one refresh across concurrent expired requests", async () => {
    storeSession(admin, "expired-token");
    let refreshCalls = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (input === "/api/auth/refresh") {
        refreshCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 0));
        return new Response(JSON.stringify({ token: "fresh-token", user: admin }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      const headers = init?.headers as Headers;
      if (headers.get("Authorization") === "Bearer expired-token") {
        return new Response(null, { status: 401 });
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await Promise.all([
      apiRequest("/api/admin/settings"),
      apiRequest("/api/admin/agent-test-chats"),
    ]);

    expect(refreshCalls).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it("does not refresh twice when a late 401 used the previous token", async () => {
    storeSession(admin, "expired-token");
    let refreshCalls = 0;
    let oldTokenCalls = 0;
    let releaseLateResponse: (() => void) | undefined;
    const lateResponse = new Promise<void>((resolve) => {
      releaseLateResponse = resolve;
    });
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (input === "/api/auth/refresh") {
        refreshCalls += 1;
        return new Response(JSON.stringify({ token: "fresh-token", user: admin }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      const headers = init?.headers as Headers;
      if (headers.get("Authorization") === "Bearer expired-token") {
        oldTokenCalls += 1;
        if (oldTokenCalls === 2) {
          await lateResponse;
        }
        return new Response(null, { status: 401 });
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const first = apiRequest("/api/admin/settings");
    const late = apiRequest("/api/admin/agent-test-chats");
    await vi.waitFor(() => expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe("fresh-token"));
    releaseLateResponse?.();
    await Promise.all([first, late]);

    expect(refreshCalls).toBe(1);
  });

  it("clears the stale local session when the refresh session has expired", async () => {
    storeSession(admin, "expired-token");
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (input === "/api/auth/refresh") {
        return new Response(JSON.stringify({ message: "Session expired" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(null, { status: 401 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiRequest("/api/admin/settings")).rejects.toMatchObject({ status: 401 });

    expect(isLoggedIn()).toBe(false);
    expect(readStoredUser()).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps the local session when refresh is temporarily unavailable", async () => {
    storeSession(admin, "expired-token");
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (input === "/api/auth/refresh") {
        return new Response(JSON.stringify({ message: "Temporary outage" }), {
          status: 503,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(null, { status: 401 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiRequest("/api/admin/settings")).rejects.toMatchObject({ status: 401 });

    expect(isLoggedIn()).toBe(true);
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe("expired-token");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
