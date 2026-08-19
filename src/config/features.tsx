import { lazy } from "react";
import type { AppFeature } from "../types/feature";
import { featureCatalog } from "./featureCatalog";

const pagesById: Record<string, AppFeature["Page"]> = {
  workout: lazy(() => import("../features/workout/WorkoutPage")),
  properties: lazy(() => import("../features/properties/PropertiesPage")),
  agents: lazy(() => import("../features/agents/AgentsPage")),
  wireguard: lazy(() => import("../features/wireguard/WireGuardPage")),
  observability: lazy(() => import("../features/observability/GrafanaPage")),
  temporal: lazy(() => import("../features/temporal/TemporalPage")),
  dashboard: lazy(() => import("../features/admin/AdminPage")),
};

/**
 * Register new tabs in featureCatalog.tsx (metadata) and map the page here.
 * Access metadata hides restricted items and wraps routes in the matching server-backed gate.
 */
export const appFeatures: AppFeature[] = featureCatalog.map((entry) => {
  const Page = pagesById[entry.id];
  if (!Page) {
    throw new Error(`No page component for feature id: ${entry.id}`);
  }
  return { ...entry, Page };
});

export { featureById, featurePath } from "./featureCatalog";
