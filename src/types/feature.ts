import type { ComponentType, ReactNode } from "react";

/** One sidebar tab / Refine resource in my-utils. */
export type AppFeature = {
  /** Refine resource name (stable id). */
  id: string;
  /** Browser path, e.g. `/` or `/json`. */
  path: string;
  label: string;
  icon: ReactNode;
  Page: ComponentType;
  requiresAuth?: boolean;
  /** Shared tab password (localStorage); workout stays open. */
  requiresTabPassword?: boolean;
  /** Renders as `<Route index />` when true. */
  index?: boolean;
  /** Extra paths that redirect to `path` (no leading slash). */
  aliases?: string[];
};
