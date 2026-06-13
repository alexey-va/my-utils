import {
  CodeOutlined,
  DashboardOutlined,
  HomeOutlined,
  ScheduleOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import type { ReactNode } from "react";

/** Sidebar / route metadata without page components (avoids import cycles). */
export type FeatureCatalogEntry = {
  id: string;
  path: string;
  label: string;
  icon: ReactNode;
  requiresAuth?: boolean;
  index?: boolean;
  aliases?: string[];
};

export const featureCatalog: FeatureCatalogEntry[] = [
  {
    id: "generators",
    path: "/",
    label: "Generators",
    icon: <ThunderboltOutlined />,
    index: true,
    aliases: ["generators"],
  },
  {
    id: "json",
    path: "/json",
    label: "JSON Prettify",
    icon: <CodeOutlined />,
  },
  {
    id: "workout",
    path: "/workout",
    label: "Workout",
    icon: <TrophyOutlined />,
  },
  {
    id: "properties",
    path: "/properties",
    label: "Properties",
    icon: <SettingOutlined />,
  },
  {
    id: "observability",
    path: "/observability",
    label: "Grafana",
    icon: <DashboardOutlined />,
  },
  {
    id: "temporal",
    path: "/temporal",
    label: "Temporal",
    icon: <ScheduleOutlined />,
  },
  {
    id: "dashboard",
    path: "/admin",
    label: "Admin panel",
    icon: <HomeOutlined />,
    requiresAuth: true,
  },
];

export function featureById(id: string): FeatureCatalogEntry | undefined {
  return featureCatalog.find((f) => f.id === id);
}

export function featurePath(id: string): string {
  const feature = featureById(id);
  if (!feature) {
    throw new Error(`Unknown feature id: ${id}`);
  }
  return feature.path;
}
