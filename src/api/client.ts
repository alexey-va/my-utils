import {
  AUTH_TOKEN_KEY,
  clearSession,
  isLoggedIn,
  storeSession,
} from "../auth/session";
import { ApiError } from "./errors";
import { apiEndpoints } from "./endpoints";
import type { LoginResponse } from "./types";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export type ApiRequestOptions = RequestInit & {
  /** JSON body — sets Content-Type and stringifies. */
  json?: unknown;
  /** Skip Authorization header even when a token exists. */
  skipAuth?: boolean;
};

export function buildApiUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  let normalized = path.startsWith("/") ? path : `/${path}`;
  if (API_BASE_URL.endsWith("/api") && normalized.startsWith("/api/")) {
    normalized = normalized.slice(4);
  }
  return API_BASE_URL ? `${API_BASE_URL}${normalized}` : normalized;
}

type RefreshResult = "refreshed" | "expired" | "unavailable";

let refreshPromise: Promise<RefreshResult> | null = null;

async function refreshSession(): Promise<RefreshResult> {
  if (!isLoggedIn()) {
    return "expired";
  }
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(buildApiUrl(apiEndpoints.auth.refresh), {
          method: "POST",
          credentials: "include",
        });
        if (response.status === 401 || response.status === 403) {
          clearSession();
          return "expired";
        }
        if (!response.ok) {
          return "unavailable";
        }
        const refreshed = (await response.json()) as LoginResponse;
        if (!refreshed.token || !refreshed.user) {
          return "unavailable";
        }
        storeSession(refreshed.user, refreshed.token);
        return "refreshed";
      } catch {
        return "unavailable";
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

type PerformedRequest = {
  response: Response;
  accessToken: string | null;
};

async function performRequest(
  path: string,
  options: ApiRequestOptions,
): Promise<PerformedRequest> {
  const { json, skipAuth, headers: initHeaders, body: initBody, ...init } = options;
  const headers = new Headers(initHeaders);

  if (json !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const accessToken = skipAuth ? null : localStorage.getItem(AUTH_TOKEN_KEY);
  const auth = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  for (const [key, value] of Object.entries(auth)) {
    headers.set(key, value);
  }

  const response = await fetch(buildApiUrl(path), {
    ...init,
    credentials: init.credentials ?? "include",
    headers,
    body: json !== undefined ? JSON.stringify(json) : initBody,
  });
  return { response, accessToken };
}

/**
 * Typed fetch wrapper for future backend calls.
 * Set `VITE_API_BASE_URL` in `.env` when the API is available.
 */
export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  let performed = await performRequest(path, options);
  let response = performed.response;
  if (response.status === 401 && !options.skipAuth && isLoggedIn()) {
    const currentToken = localStorage.getItem(AUTH_TOKEN_KEY);
    const refreshResult = performed.accessToken && currentToken !== performed.accessToken
      ? "refreshed"
      : await refreshSession();
    if (refreshResult === "refreshed") {
      performed = await performRequest(path, options);
      response = performed.response;
      if (response.status === 401) {
        clearSession();
      }
    }
  }

  if (!response.ok) {
    const body = await response.text();
    let message = body || response.statusText || `Request failed (${response.status})`;
    if (body && (response.headers.get("content-type") ?? "").includes("application/json")) {
      try {
        const parsed = JSON.parse(body) as { message?: unknown };
        if (typeof parsed.message === "string" && parsed.message.trim()) {
          message = parsed.message;
        }
      } catch {
        // Keep the raw response when a server labels malformed JSON as application/json.
      }
    }
    throw new ApiError(
      response.status,
      message,
      body,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
}

export const apiClient = {
  get: <T>(path: string, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, json?: unknown, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: "POST", json }),
  put: <T>(path: string, json?: unknown, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: "PUT", json }),
  patch: <T>(path: string, json?: unknown, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: "PATCH", json }),
  delete: <T>(path: string, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: "DELETE" }),
};
