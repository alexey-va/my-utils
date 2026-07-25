import type { AuthUser } from "../api/types";

export const AUTH_TOKEN_KEY = "token";
export const AUTH_USER_KEY = "user";

export function isLoggedIn(): boolean {
  return Boolean(localStorage.getItem(AUTH_TOKEN_KEY));
}

export function readStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(AUTH_USER_KEY);
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
}

export function clearSession(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}
