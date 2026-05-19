import type { AuthProvider } from "@refinedev/core";
import { apiClient, ApiError } from "../api";
import { apiEndpoints } from "../api/endpoints";
import type { LoginResponse } from "../api/types";
import { clearSession, isLoggedIn, readStoredUser, storeSession } from "../auth/session";
import { PATH_HOME } from "../config/paths";

export const authProvider: AuthProvider = {
  login: async ({ email, password, redirectTo }) => {
    if (!email || !password) {
      return {
        success: false,
        error: { name: "Login failed", message: "Invalid credentials" },
      };
    }

    try {
      const res = await apiClient.post<LoginResponse>(
        apiEndpoints.auth.login,
        { email, password },
        { skipAuth: true },
      );
      storeSession(res.user.email, res.token);
      return {
        success: true,
        redirectTo: typeof redirectTo === "string" ? redirectTo : PATH_HOME,
      };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Login failed";
      return {
        success: false,
        error: { name: "Login failed", message },
      };
    }
  },
  logout: async () => {
    if (isLoggedIn()) {
      try {
        await apiClient.post(apiEndpoints.auth.logout);
      } catch {
        // Clear local session even if API is unreachable
      }
    }
    clearSession();
    return { success: true, redirectTo: PATH_HOME };
  },
  /** App shell is always reachable; use access control + RequireAuth for restricted routes. */
  check: async () => ({ authenticated: true }),
  getIdentity: async () => (isLoggedIn() ? readStoredUser() : null),
  getPermissions: async () => null,
  onError: async (error) => ({ error }),
};
