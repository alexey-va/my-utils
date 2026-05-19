import type { ResourceProps } from "@refinedev/core";
import { appFeatures } from "./features";

/** Refine menu resources — derived from the feature registry. */
export const appResources: ResourceProps[] = appFeatures.map(
  ({ id, path, label, icon, requiresAuth }) => ({
    name: id,
    list: path,
    meta: { label, icon, requiresAuth },
  }),
);
