export const JSON_STORE_KEY = "generators_json_state_v2";
export const JSON_HISTORY_KEY = "generators_json_history_v2";
export const JSON_HISTORY_LIMIT = 20;

export type HistItem = { id: string; ts: number; value: string };

export type JsonFormatMode = "pretty" | "minify";

export type JsonToolPersistedState = {
  input: string;
  indent: number;
  sortKeys: boolean;
  highlight: boolean;
  formatMode: JsonFormatMode;
};

export type JsonToolInitialSnapshot = JsonToolPersistedState & {
  history: HistItem[];
};

const DEFAULT_JSON_TOOL_STATE: JsonToolPersistedState = {
  input: "",
  indent: 2,
  sortKeys: false,
  highlight: true,
  formatMode: "pretty",
};

/** Read persisted JSON tool state synchronously (safe during useState init). */
export function loadJsonToolState(): JsonToolPersistedState {
  try {
    const raw = localStorage.getItem(JSON_STORE_KEY);
    if (!raw) {
      return { ...DEFAULT_JSON_TOOL_STATE };
    }
    const v = JSON.parse(raw) as Partial<JsonToolPersistedState> & { output?: string };
    const formatMode =
      v.formatMode === "pretty" || v.formatMode === "minify"
        ? v.formatMode
        : DEFAULT_JSON_TOOL_STATE.formatMode;
    return {
      input: typeof v.input === "string" ? v.input : "",
      indent: typeof v.indent === "number" ? v.indent : DEFAULT_JSON_TOOL_STATE.indent,
      sortKeys: typeof v.sortKeys === "boolean" ? v.sortKeys : DEFAULT_JSON_TOOL_STATE.sortKeys,
      highlight:
        typeof v.highlight === "boolean" ? v.highlight : DEFAULT_JSON_TOOL_STATE.highlight,
      formatMode,
    };
  } catch {
    return { ...DEFAULT_JSON_TOOL_STATE };
  }
}

export function loadJsonHistory(): HistItem[] {
  try {
    const raw = localStorage.getItem(JSON_HISTORY_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as HistItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadJsonToolSnapshot(): JsonToolInitialSnapshot {
  return {
    ...loadJsonToolState(),
    history: loadJsonHistory(),
  };
}

export type JsonParseError = {
  message: string;
  pos: number;
  line: number;
  col: number;
  excerpt: string;
};

export function sortObject<T>(obj: T): T {
  if (Array.isArray(obj)) return obj.map(sortObject) as unknown as T;
  if (obj && typeof obj === "object") {
    const entries = Object.entries(obj as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, sortObject(v)]);
    return Object.fromEntries(entries) as unknown as T;
  }
  return obj;
}

export function pushHistory(list: HistItem[], value: string): HistItem[] {
  const trimmed = value.trim();
  if (!trimmed) return list;
  const now = Date.now();
  const idx = list.findIndex((h) => h.value === trimmed);
  if (idx >= 0) {
    const item = { ...list[idx], ts: now };
    return [item, ...list.slice(0, idx), ...list.slice(idx + 1)].slice(
      0,
      JSON_HISTORY_LIMIT,
    );
  }
  const item: HistItem = {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    ts: now,
    value: trimmed,
  };
  return [item, ...list].slice(0, JSON_HISTORY_LIMIT);
}

function locate(raw: string, pos: number) {
  let line = 1;
  let col = 1;
  for (let i = 0; i < pos && i < raw.length; i++) {
    if (raw[i] === "\n") {
      line++;
      col = 1;
    } else {
      col++;
    }
  }
  return { line, col };
}

function extractPosFromError(e: unknown): number | null {
  const msg = String((e as Error)?.message ?? "");
  const m = msg.match(/position\s+(\d+)/i);
  return m ? Number(m[1]) : null;
}

function mkExcerpt(raw: string, pos: number, span = 60): string {
  const start = Math.max(0, pos - span);
  const end = Math.min(raw.length, pos + span);
  const slice = raw.slice(start, end);
  const caret = " ".repeat(Math.max(0, pos - start)) + "^";
  return `${slice}\n${caret}`;
}

export function formatJson(
  raw: string,
  options: { indent: number; sortKeys: boolean; mode: JsonFormatMode },
): { output: string; parseErr: JsonParseError | null } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { output: "", parseErr: null };
  }

  const result = parseJsonOrError(raw);
  if (!result.ok) {
    return { output: "", parseErr: result.error };
  }

  const data = options.sortKeys ? sortObject(result.data) : result.data;
  const output =
    options.mode === "pretty"
      ? JSON.stringify(data, null, options.indent)
      : JSON.stringify(data);

  return { output, parseErr: null };
}

export function parseJsonOrError(
  raw: string,
): { ok: true; data: unknown } | { ok: false; error: JsonParseError } {
  try {
    return { ok: true, data: JSON.parse(raw) };
  } catch (e) {
    const message = String((e as Error)?.message ?? "JSON error");
    const pos = extractPosFromError(e);
    if (pos != null) {
      const { line, col } = locate(raw, pos);
      return {
        ok: false,
        error: { message, pos, line, col, excerpt: mkExcerpt(raw, pos) },
      };
    }
    return {
      ok: false,
      error: { message, pos: -1, line: -1, col: -1, excerpt: "" },
    };
  }
}

export function makeHistoryLabel(v: string, ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const snippet = v.replace(/\s+/g, " ").slice(0, 48);
  return `${hh}:${mm} • ${snippet}${v.length > 48 ? "…" : ""}`;
}
