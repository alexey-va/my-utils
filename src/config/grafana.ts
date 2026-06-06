export const GRAFANA_EMBED_PATH_KEY = "grafana.embed.path";

const GRAFANA_PREFIX = "/grafana/";

/** Last iframe path under /grafana/ (path + query), e.g. d/uid/slug?orgId=1 */
export function readSavedGrafanaEmbedPath(): string | null {
  try {
    const raw = sessionStorage.getItem(GRAFANA_EMBED_PATH_KEY)?.trim();
    if (!raw || raw.startsWith("login")) {
      return null;
    }
    return raw;
  } catch {
    return null;
  }
}

export function writeSavedGrafanaEmbedPath(relativePath: string): void {
  const trimmed = relativePath.trim().replace(/^\//, "");
  if (!trimmed || trimmed.startsWith("login")) {
    return;
  }
  try {
    sessionStorage.setItem(GRAFANA_EMBED_PATH_KEY, trimmed);
  } catch {
    // private mode / quota
  }
}

/** Read same-origin iframe location and persist for reload. */
export function persistGrafanaIframePath(iframe: HTMLIFrameElement): void {
  try {
    const loc = iframe.contentWindow?.location;
    if (!loc) {
      return;
    }
    const full = `${loc.pathname}${loc.search}`;
    if (!full.startsWith(GRAFANA_PREFIX)) {
      return;
    }
    writeSavedGrafanaEmbedPath(full.slice(GRAFANA_PREFIX.length));
  } catch {
    // cross-origin — cannot read iframe URL
  }
}

type GrafanaUrlOptions = {
  /** Path under /grafana/ (e.g. dashboards, d/uid/slug). Falls back to VITE_GRAFANA_PATH. */
  path?: string;
  /** Hide Grafana chrome (sidebar/top nav). Default false — full browse UI. */
  kiosk?: boolean;
};

/** Grafana embed URL (iframe). Empty env → same-origin /grafana/ (nginx proxy, first-party cookies). */
export function grafanaEmbedUrl(options: GrafanaUrlOptions = {}): string {
  const kiosk = options.kiosk ?? false;
  const configured = import.meta.env.VITE_GRAFANA_URL?.trim();
  const base = (configured && configured.length > 0 ? configured : "/grafana").replace(/\/$/, "");
  const path = (options.path ?? import.meta.env.VITE_GRAFANA_PATH ?? "dashboards").trim();
  let url = path ? `${base}/${path.replace(/^\//, "")}` : `${base}/`;
  const params = new URLSearchParams();
  params.set("orgId", "1");
  if (kiosk) {
    params.set("kiosk", "");
  }
  url += `${url.includes("?") ? "&" : "?"}${params.toString()}`;
  return url;
}
