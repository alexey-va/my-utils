import type { AuthUser } from "../api/types";

export const AUTH_TOKEN_KEY = "token";
export const AUTH_USER_KEY = "user";

const sessionListeners = new Set<() => void>();

function notifySessionListeners(): void {
  sessionListeners.forEach((listener) => listener());
}

export function getStoredUserSnapshot(): string | null {
  return localStorage.getItem(AUTH_USER_KEY);
}

export function subscribeToSession(listener: () => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === AUTH_USER_KEY || event.key === AUTH_TOKEN_KEY || event.key === null) {
      listener();
    }
  };

  sessionListeners.add(listener);
  window.addEventListener("storage", handleStorage);

  return () => {
    sessionListeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

export function isLoggedIn(): boolean {
  return Boolean(localStorage.getItem(AUTH_TOKEN_KEY));
}

export function readStoredUser(raw = getStoredUserSnapshot()): AuthUser | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if (
      typeof parsed.id !== "string" ||
      typeof parsed.username !== "string" ||
      typeof parsed.email !== "string" ||
      (parsed.role !== "USER" && parsed.role !== "ADMIN")
    ) {
      return null;
    }
    return {
      id: parsed.id,
      username: parsed.username,
      email: parsed.email,
      role: parsed.role,
      mustChangePassword: parsed.mustChangePassword === true,
    };
  } catch {
    return null;
  }
}

export function storeSession(user: AuthUser, token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  notifySessionListeners();
}

export function clearSession(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  notifySessionListeners();
}
