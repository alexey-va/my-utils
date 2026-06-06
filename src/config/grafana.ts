type GrafanaUrlOptions = {
  /** Path under /grafana/ (e.g. explore, d/uid/slug). Falls back to VITE_GRAFANA_PATH. */
  path?: string;
  /** Hide Grafana chrome (sidebar/top nav). Default true for iframe embed. */
  kiosk?: boolean;
};

/** Grafana embed URL (iframe). Empty env → same-origin /grafana/ (nginx proxy, first-party cookies). */
export function grafanaEmbedUrl(options: GrafanaUrlOptions = {}): string {
  const kiosk = options.kiosk ?? true;
  const configured = import.meta.env.VITE_GRAFANA_URL?.trim();
  const base = (configured && configured.length > 0 ? configured : "/grafana").replace(/\/$/, "");
  const path = (options.path ?? import.meta.env.VITE_GRAFANA_PATH ?? "").trim();
  let url = path ? `${base}/${path.replace(/^\//, "")}` : `${base}/`;
  const params = new URLSearchParams();
  params.set("orgId", "1");
  if (kiosk) {
    params.set("kiosk", "");
  }
  url += `${url.includes("?") ? "&" : "?"}${params.toString()}`;
  return url;
}
