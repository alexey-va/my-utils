import type { ReactNode } from "react";

/** Extra fields on Refine `resources[].meta` in this app. */
export type AppResourceMeta = {
  label?: string;
  icon?: ReactNode;
  requiresAuth?: boolean;
  parent?: string;
};
