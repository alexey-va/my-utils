import {
  DashboardOutlined,
  HomeOutlined,
  MessageOutlined,
  ScheduleOutlined,
  SettingOutlined,
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
    id: "workout",
    path: "/",
    label: "Workout",
    icon: <TrophyOutlined />,
    index: true,
    aliases: ["workout", "generators", "json"],
  },
  {
    id: "properties",
    path: "/properties",
    label: "Properties",
    icon: <SettingOutlined />,
  },
  {
    id: "agents",
    path: "/agents",
    label: "Agent traces",
    icon: <MessageOutlined />,
  },
  {
    id: "observability",
    path: "/observability",
    label: "Grafana",
    icon: <DashboardOutlined />,
  },
  {
    id: "temporal",
    path: "/workflows",
    label: "Temporal",
    icon: <ScheduleOutlined />,
    aliases: ["temporal"],
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
