/** Grafana embed URL (iframe). Empty env → same-origin /grafana/ (nginx proxy, first-party cookies). */
export function grafanaEmbedUrl(): string {
  const configured = import.meta.env.VITE_GRAFANA_URL?.trim();
  const base = (configured && configured.length > 0 ? configured : "/grafana").replace(/\/$/, "");
  const path = (import.meta.env.VITE_GRAFANA_PATH ?? "").trim();
  if (!path) {
    return `${base}/`;
  }
  return `${base}/${path.replace(/^\//, "")}`;
}
