import {
  DashboardOutlined,
  ApiOutlined,
  HomeOutlined,
  MessageOutlined,
  ScheduleOutlined,
  SettingOutlined,
  TrophyOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import type { ReactNode } from "react";

export const PATH_WORKOUT_OVERVIEW = "/workout/overview";
export const PATH_WORKOUT_JOURNAL = "/workout/journal";

/** Sidebar / route metadata without page components (avoids import cycles). */
export type FeatureCatalogEntry = {
  id: string;
  path: string;
  label: string;
  icon: ReactNode;
  requiresAuth?: boolean;
  requiresAdmin?: boolean;
  index?: boolean;
  /** Additional browser paths that render this feature directly. */
  paths?: string[];
  aliases?: string[];
};

export const featureCatalog: FeatureCatalogEntry[] = [
  {
    id: "workout",
    path: "/",
    label: "Workout",
    icon: <TrophyOutlined />,
    index: true,
    paths: [PATH_WORKOUT_OVERVIEW, PATH_WORKOUT_JOURNAL],
    aliases: ["workout", "generators", "json"],
  },
  {
    id: "properties",
    path: "/properties",
    label: "Properties",
    icon: <SettingOutlined />,
    requiresAdmin: true,
  },
  {
    id: "agents",
    path: "/agents",
    label: "Agents",
    icon: <MessageOutlined />,
    requiresAdmin: true,
  },
  {
    id: "wireguard",
    path: "/wireguard",
    label: "WireGuard",
    icon: <SafetyCertificateOutlined />,
    requiresAdmin: true,
  },
  {
    id: "network",
    path: "/network",
    label: "Server Gateway",
    icon: <ApiOutlined />,
    requiresAdmin: true,
  },
  {
    id: "observability",
    path: "/observability",
    label: "Grafana",
    icon: <DashboardOutlined />,
    requiresAdmin: true,
  },
  {
    id: "temporal",
    path: "/workflows",
    label: "Temporal",
    icon: <ScheduleOutlined />,
    aliases: ["temporal"],
    requiresAdmin: true,
  },
  {
    id: "dashboard",
    path: "/admin",
    label: "Admin panel",
    icon: <HomeOutlined />,
    requiresAdmin: true,
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
