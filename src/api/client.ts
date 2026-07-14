import { AUTH_TOKEN_KEY } from "../auth/session";
import { ApiError } from "./errors";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export type ApiRequestOptions = RequestInit & {
  /** JSON body — sets Content-Type and stringifies. */
  json?: unknown;
  /** Skip Authorization header even when a token exists. */
  skipAuth?: boolean;
};

function buildUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  let normalized = path.startsWith("/") ? path : `/${path}`;
  if (API_BASE_URL.endsWith("/api") && normalized.startsWith("/api/")) {
    normalized = normalized.slice(4);
  }
  return API_BASE_URL ? `${API_BASE_URL}${normalized}` : normalized;
}

function authHeaders(skipAuth?: boolean): HeadersInit {
  if (skipAuth) {
    return {};
  }
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Typed fetch wrapper for future backend calls.
 * Set `VITE_API_BASE_URL` in `.env` when the API is available.
 */
export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { json, skipAuth, headers: initHeaders, body: initBody, ...init } = options;
  const headers = new Headers(initHeaders);

  if (json !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const auth = authHeaders(skipAuth);
  for (const [key, value] of Object.entries(auth)) {
    headers.set(key, value);
  }

  const response = await fetch(buildUrl(path), {
    ...init,
    headers,
    body: json !== undefined ? JSON.stringify(json) : initBody,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new ApiError(
      response.status,
      body || response.statusText || `Request failed (${response.status})`,
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
