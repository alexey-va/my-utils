export type GrafanaPanel = {
  id: string;
  title: string;
  /**
   * Path inside Grafana (after /grafana/).
   * From browser URL https://utils…/grafana/d/UID/title → `d/UID/title`
   */
  path: string;
};

/** Live Grafana Loki datasource uid on utils.alexeyav.ru */
const LOKI_DS_UID = "bedlw839mzuo0d";

function lokiExplorePath(query: string): string {
  const panes = {
    n: {
      datasource: LOKI_DS_UID,
      queries: [
        {
          refId: "A",
          expr: query,
          datasource: { type: "loki", uid: LOKI_DS_UID },
        },
      ],
      range: { from: "now-1h", to: "now" },
    },
  };
  return `explore?schemaVersion=1&panes=${encodeURIComponent(JSON.stringify(panes))}`;
}

/** Default dashboards when VITE_GRAFANA_DASHBOARDS is not set. Add UIDs from Grafana URL here. */
const DEFAULT_PANELS: GrafanaPanel[] = [
  {
    id: "api-dashboard",
    title: "My Utils API Logs",
    path: "d/myutils-api-logs/my-utils-api-logs",
  },
  {
    id: "api-logs",
    title: "API logs (Explore)",
    path: lokiExplorePath('{app="my-utils-api"}'),
  },
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

/** Dashboards for the Grafana tab sidebar. Override via VITE_GRAFANA_DASHBOARDS JSON at build time. */
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
