/** Default embed path when opening the Grafana tab (not last visited). */
export const DEFAULT_GRAFANA_EMBED_PATH =
  import.meta.env.VITE_GRAFANA_PATH?.trim() || "d/myutils-api-logs/my-utils-api-logs";

type GrafanaUrlOptions = {
  /** Path under /grafana/ (e.g. d/uid/slug). Falls back to DEFAULT_GRAFANA_EMBED_PATH. */
  path?: string;
  /** Hide Grafana chrome (sidebar/top nav). Default false — full browse UI. */
  kiosk?: boolean;
};

/** Grafana embed URL (iframe). Empty env → same-origin /grafana/ (nginx proxy, first-party cookies). */
export function grafanaEmbedUrl(options: GrafanaUrlOptions = {}): string {
  const kiosk = options.kiosk ?? false;
  const configured = import.meta.env.VITE_GRAFANA_URL?.trim();
  const base = (configured && configured.length > 0 ? configured : "/grafana").replace(/\/$/, "");
  const path = (options.path ?? DEFAULT_GRAFANA_EMBED_PATH).trim();
  let url = path ? `${base}/${path.replace(/^\//, "")}` : `${base}/`;
  const params = new URLSearchParams();
  params.set("orgId", "1");
  if (kiosk) {
    params.set("kiosk", "");
  }
  url += `${url.includes("?") ? "&" : "?"}${params.toString()}`;
  return url;
}
