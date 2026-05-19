export const AUTH_TOKEN_KEY = "token";
export const AUTH_USER_KEY = "user";

export function isLoggedIn(): boolean {
  return Boolean(localStorage.getItem(AUTH_TOKEN_KEY));
}

export function readStoredUser(): { email: string } | null {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as { email: string };
  } catch {
    return null;
  }
}

export function storeSession(email: string, token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify({ email }));
}

export function clearSession(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}
