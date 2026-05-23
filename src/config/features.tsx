import {
  CodeOutlined,
  DashboardOutlined,
  HomeOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import type { AppFeature } from "../types/feature";
import GeneratorsPage from "../features/generators/GeneratorsPage";
import JsonPage from "../features/json/JsonPage";
import AdminPage from "../features/admin/AdminPage";
import WorkoutPage from "../features/workout/WorkoutPage";
import PropertiesPage from "../features/properties/PropertiesPage";
import GrafanaPage from "../features/observability/GrafanaPage";

/**
 * Register new tabs here: one entry drives Refine resources, sidebar, and routes.
 * Optional `requiresAuth` hides the item when signed out and wraps the page in RequireAuth.
 */
export const appFeatures: AppFeature[] = [
  {
    id: "generators",
    path: "/",
    label: "Generators",
    icon: <ThunderboltOutlined />,
    Page: GeneratorsPage,
    index: true,
    aliases: ["generators"],
  },
  {
    id: "json",
    path: "/json",
    label: "JSON Prettify",
    icon: <CodeOutlined />,
    Page: JsonPage,
  },
  {
    id: "workout",
    path: "/workout",
    label: "Workout",
    icon: <TrophyOutlined />,
    Page: WorkoutPage,
  },
  {
    id: "properties",
    path: "/properties",
    label: "Properties",
    icon: <SettingOutlined />,
    Page: PropertiesPage,
  },
  {
    id: "observability",
    path: "/observability",
    label: "Logs",
    icon: <DashboardOutlined />,
    Page: GrafanaPage,
  },
  {
    id: "dashboard",
    path: "/admin",
    label: "Admin panel",
    icon: <HomeOutlined />,
    Page: AdminPage,
    requiresAuth: true,
  },
];

export function featureById(id: string): AppFeature | undefined {
  return appFeatures.find((f) => f.id === id);
}

export function featurePath(id: string): string {
  const feature = featureById(id);
  if (!feature) {
    throw new Error(`Unknown feature id: ${id}`);
  }
  return feature.path;
}
