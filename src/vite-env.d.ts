/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  /** Full Grafana origin or path prefix. Default: /grafana (same host, nginx proxy). */
  readonly VITE_GRAFANA_URL?: string;
  /** Optional path after base, e.g. explore or d/abc/my-dashboard */
  readonly VITE_GRAFANA_PATH?: string;
  /** JSON array of { id, title, path } for Logs tab panels */
  readonly VITE_GRAFANA_DASHBOARDS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
