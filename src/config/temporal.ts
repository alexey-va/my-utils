export const TEMPORAL_EMBED_PATH_KEY = "temporal.embed.path";

const TEMPORAL_PREFIX = "/temporal/";

/** Last iframe path under /temporal/ (path + query), e.g. namespaces/default/workflows */
export function readSavedTemporalEmbedPath(): string | null {
  try {
    const raw = sessionStorage.getItem(TEMPORAL_EMBED_PATH_KEY)?.trim();
    if (!raw) {
      return null;
    }
    return raw;
  } catch {
    return null;
  }
}

export function writeSavedTemporalEmbedPath(relativePath: string): void {
  const trimmed = relativePath.trim().replace(/^\//, "");
  if (!trimmed) {
    return;
  }
  try {
    sessionStorage.setItem(TEMPORAL_EMBED_PATH_KEY, trimmed);
  } catch {
    // private mode / quota
  }
}

/** Read same-origin iframe location and persist for reload. */
export function persistTemporalIframePath(iframe: HTMLIFrameElement): void {
  try {
    const loc = iframe.contentWindow?.location;
    if (!loc) {
      return;
    }
    const full = `${loc.pathname}${loc.search}`;
    if (!full.startsWith(TEMPORAL_PREFIX)) {
      return;
    }
    writeSavedTemporalEmbedPath(full.slice(TEMPORAL_PREFIX.length));
  } catch {
    // cross-origin — cannot read iframe URL
  }
}

type TemporalUrlOptions = {
  /** Path under /temporal/ (e.g. namespaces/default/workflows). Falls back to VITE_TEMPORAL_PATH. */
  path?: string;
};

/** Temporal UI embed URL (iframe). Empty env → same-origin /temporal/ (nginx proxy). */
export function temporalEmbedUrl(options: TemporalUrlOptions = {}): string {
  const configured = import.meta.env.VITE_TEMPORAL_URL?.trim();
  const base = (configured && configured.length > 0 ? configured : "/temporal").replace(/\/$/, "");
  const path = (options.path ?? import.meta.env.VITE_TEMPORAL_PATH ?? "").trim();
  if (!path) {
    return `${base}/`;
  }
  return `${base}/${path.replace(/^\//, "")}`;
}
