import type { AuthUser } from "../api/types";
import type { AppResourceMeta } from "../types/resource";

export function canAccessResource(
  meta: AppResourceMeta | undefined,
  user: AuthUser | null,
): boolean {
  if (meta?.requiresAdmin === true) {
    return user?.role === "ADMIN" && !user.mustChangePassword;
  }
  if (meta?.requiresAuth === true) {
    return user !== null;
  }
  return true;
}
