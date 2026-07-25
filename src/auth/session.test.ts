import { describe, expect, it } from "vitest";
import type { AuthUser } from "../api/types";
import {
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  clearSession,
  isLoggedIn,
  readStoredUser,
  storeSession,
} from "./session";

const admin: AuthUser = {
  id: "00000000-0000-0000-0000-000000000001",
  username: "freedeeml",
  email: "freedeeml@local.invalid",
  role: "ADMIN",
  mustChangePassword: true,
};

describe("auth session", () => {
  it("stores and restores the full identity", () => {
    storeSession(admin, "signed-token");

    expect(isLoggedIn()).toBe(true);
    expect(readStoredUser()).toEqual(admin);
  });

  it("rejects malformed stored identities", () => {
    localStorage.setItem(AUTH_TOKEN_KEY, "signed-token");
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify({ username: "broken" }));

    expect(readStoredUser()).toBeNull();
  });

  it("clears both token and identity", () => {
    storeSession(admin, "signed-token");
    clearSession();

    expect(isLoggedIn()).toBe(false);
    expect(readStoredUser()).toBeNull();
  });
});
