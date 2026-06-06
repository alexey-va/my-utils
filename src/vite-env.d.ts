/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  /** Full Grafana origin or path prefix. Default: /grafana (same host, nginx proxy). */
  readonly VITE_GRAFANA_URL?: string;
  /** Path after /grafana/ when opening the tab. Default: dashboards */
  readonly VITE_GRAFANA_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
