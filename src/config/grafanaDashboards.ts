export type GrafanaPanel = {
  id: string;
  title: string;
  /**
   * Path inside Grafana (after /grafana/).
   * From browser URL https://utils…/grafana/d/UID/title → `d/UID/title`
   */
  path: string;
};

function lokiExplorePath(query: string): string {
  const panes = {
    n: {
      datasource: "loki",
      queries: [
        {
          refId: "A",
          expr: query,
          datasource: { type: "loki", uid: "loki" },
        },
      ],
      range: { from: "now-1h", to: "now" },
    },
  };
  return `explore?schemaVersion=1&panes=${encodeURIComponent(JSON.stringify(panes))}&orgId=1`;
}

/** Default panels when VITE_GRAFANA_DASHBOARDS is not set. Add your dashboard UIDs here. */
const DEFAULT_PANELS: GrafanaPanel[] = [
  {
    id: "api-dashboard",
    title: "Dashboard",
    path: "d/myutils-api-logs/my-utils-api-logs",
  },
  { id: "api-logs", title: "Explore", path: lokiExplorePath('{app="my-utils-api"}') },
];

function isPanel(value: unknown): value is GrafanaPanel {
  if (typeof value !== "object" || value == null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.id === "string" &&
    p.id.length > 0 &&
    typeof p.title === "string" &&
    p.title.length > 0 &&
    typeof p.path === "string" &&
    p.path.length > 0
  );
}

/** Panels to show as tabs. Override via VITE_GRAFANA_DASHBOARDS JSON at build time. */
export function grafanaPanels(): GrafanaPanel[] {
  const raw = import.meta.env.VITE_GRAFANA_DASHBOARDS?.trim();
  if (!raw) {
    return DEFAULT_PANELS;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(isPanel)) {
      return parsed;
    }
  } catch {
    // invalid JSON — fall back
  }
  return DEFAULT_PANELS;
}
