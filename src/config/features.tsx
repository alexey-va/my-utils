import type { AppFeature } from "../types/feature";
import { featureCatalog } from "./featureCatalog";
import GeneratorsPage from "../features/generators/GeneratorsPage";
import JsonPage from "../features/json/JsonPage";
import AdminPage from "../features/admin/AdminPage";
import WorkoutPage from "../features/workout/WorkoutPage";
import PropertiesPage from "../features/properties/PropertiesPage";
import GrafanaPage from "../features/observability/GrafanaPage";
import TemporalPage from "../features/temporal/TemporalPage";

const pagesById: Record<string, AppFeature["Page"]> = {
  generators: GeneratorsPage,
  json: JsonPage,
  workout: WorkoutPage,
  properties: PropertiesPage,
  observability: GrafanaPage,
  temporal: TemporalPage,
  dashboard: AdminPage,
};

/**
 * Register new tabs in featureCatalog.tsx (metadata) and map the page here.
 * Optional `requiresAuth` hides the item when signed out and wraps the page in RequireAuth.
 */
export const appFeatures: AppFeature[] = featureCatalog.map((entry) => {
  const Page = pagesById[entry.id];
  if (!Page) {
    throw new Error(`No page component for feature id: ${entry.id}`);
  }
  return { ...entry, Page };
});

export { featureById, featurePath } from "./featureCatalog";
