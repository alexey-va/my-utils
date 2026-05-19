import type { AccessControlProvider } from "@refinedev/core";
import { isLoggedIn } from "../auth/session";
import { appResources } from "../config/resources";
import type { AppResourceMeta } from "../types/resource";

function resolveMeta(
  resource: string | undefined,
  params?: { resource?: { meta?: AppResourceMeta } },
): AppResourceMeta | undefined {
  return (
    params?.resource?.meta ??
    (appResources.find((item) => item.name === resource)?.meta as AppResourceMeta | undefined)
  );
}

/** Resources with `meta.requiresAuth: true` need a signed-in user. */
export const accessControlProvider: AccessControlProvider = {
  can: async ({ resource, params }) => {
    if (resolveMeta(resource, params)?.requiresAuth !== true) {
      return { can: true };
    }
    return { can: isLoggedIn() };
  },
};
