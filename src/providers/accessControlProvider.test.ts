import { describe, expect, it } from "vitest";
import type { AuthUser } from "../api/types";
import { storeSession } from "../auth/session";
import { accessControlProvider } from "./accessControlProvider";

const baseUser: AuthUser = {
  id: "00000000-0000-0000-0000-000000000001",
  username: "tester",
  email: "tester@example.com",
  role: "USER",
  mustChangePassword: false,
};

describe("accessControlProvider", () => {
  it("keeps Workout public", async () => {
    expect(await accessControlProvider.can({ resource: "workout", action: "list" })).toEqual({
      can: true,
    });
  });

  it("blocks regular users and bootstrap admins from admin resources", async () => {
    storeSession(baseUser, "token");
    expect(await accessControlProvider.can({ resource: "properties", action: "list" })).toEqual({
      can: false,
    });

    storeSession({ ...baseUser, role: "ADMIN", mustChangePassword: true }, "token");
    expect(await accessControlProvider.can({ resource: "properties", action: "list" })).toEqual({
      can: false,
    });
  });

  it("allows an initialized administrator", async () => {
    storeSession({ ...baseUser, role: "ADMIN" }, "token");
    expect(await accessControlProvider.can({ resource: "properties", action: "list" })).toEqual({
      can: true,
    });
  });
});
