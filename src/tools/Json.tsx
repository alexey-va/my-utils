/* eslint-disable @typescript-eslint/no-explicit-any */
// src/tools/GeneratorsJson.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Card, Space, Input, Button, Typography, Upload, message, Switch, Select } from "antd";
import { UploadOutlined, CopyOutlined, DownloadOutlined, ScissorOutlined, SaveOutlined, DeleteOutlined } from "@ant-design/icons";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import jsonLang from "react-syntax-highlighter/dist/esm/languages/prism/json";
import vscDarkPlus from "react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus";

SyntaxHighlighter.registerLanguage("json", jsonLang);

const { TextArea } = Input;

const STORE_KEY = "generators_json_state_v2";
const HISTORY_KEY = "generators_json_history_v2";
const HISTORY_LIMIT = 20;

type HistItem = { id: string; ts: number; value: string };
type JsonErr = { message: string; pos: number; line: number; col: number; excerpt: string } | null;

function sortObject<T>(obj: T): T {
  if (Array.isArray(obj)) return obj.map(sortObject) as unknown as T;
  if (obj && typeof obj === "object") {
    const entries = Object.entries(obj as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, sortObject(v)]);
    return Object.fromEntries(entries) as unknown as T;
  }
  return obj;
}

function pushHistory(list: HistItem[], value: string): HistItem[] {
  const trimmed = value.trim();
  if (!trimmed) return list;
  const now = Date.now();
  const idx = list.findIndex((h) => h.value === trimmed);
  if (idx >= 0) {
    const item = { ...list[idx], ts: now };
    const next = [item, ...list.slice(0, idx), ...list.slice(idx + 1)];
    return next.slice(0, HISTORY_LIMIT);
  }
  const item: HistItem = { id: `${now}-${Math.random().toString(36).slice(2, 8)}`, ts: now, value: trimmed };
  return [item, ...list].slice(0, HISTORY_LIMIT);
}

function locate(raw: string, pos: number) {
  let line = 1, col = 1;
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
  const msg = String((e as any)?.message ?? "");
  // V8: "Unexpected token } in JSON at position 10"
  const m = msg.match(/position\s+(\d+)/i);
  if (m) return Number(m[1]);
  return null;
}

function mkExcerpt(raw: string, pos: number, span = 60): string {
  const start = Math.max(0, pos - span);
  const end = Math.min(raw.length, pos + span);
  const slice = raw.slice(start, end);
  const caret = " ".repeat(Math.max(0, pos - start)) + "^";
  return slice + "\n" + caret;
}

function makeLabel(v: string, ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const snippet = v.replace(/\s+/g, " ").slice(0, 48);
  return `${hh}:${mm} • ${snippet}${v.length > 48 ? "…" : ""}`;
}

export default function Json() {
  const [input, setInput] = useState<string>("");
  const [output, setOutput] = useState<string>("");
  const [indent, setIndent] = useState<number>(2);
  const [sortKeys, setSortKeys] = useState<boolean>(false);
  const [highlight, setHighlight] = useState<boolean>(true);

  const [history, setHistory] = useState<HistItem[]>([]);
  const [selectedHistId, setSelectedHistId] = useState<string | undefined>(undefined);
  const [parseErr, setParseErr] = useState<JsonErr>(null);
  const [hydrated, setHydrated] = useState(false);

  // hydrate once
  useEffect(() => {
    try {
      const s = localStorage.getItem(STORE_KEY);
      if (s) {
        const v = JSON.parse(s);
        if (typeof v.input === "string") setInput(v.input);
        if (typeof v.output === "string") setOutput(v.output);
        if (typeof v.indent === "number") setIndent(v.indent);
        if (typeof v.sortKeys === "boolean") setSortKeys(v.sortKeys);
        if (typeof v.highlight === "boolean") setHighlight(v.highlight);
      }
    } catch {}
    try {
      const h = localStorage.getItem(HISTORY_KEY);
      if (h) setHistory(JSON.parse(h));
    } catch {}
    setHydrated(true);
  }, []);

  // persist after hydration
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORE_KEY, JSON.stringify({ input, output, indent, sortKeys, highlight }));
  }, [input, output, indent, sortKeys, highlight, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history, hydrated]);

  const prettyDisabled = !input.trim();

  const saveToHistory = (src?: string) => {
    const val = (src ?? input).trim();
    if (!val) return;
    setHistory((prev) => pushHistory(prev, val));
  };

  const loadFromHistory = (id: string) => {
    const item = history.find((h) => h.id === id);
    if (!item) return;
    // push current input, then load selected
    setHistory((prev) => pushHistory(prev, input));
    setInput(item.value);
    setSelectedHistId(id);
    setParseErr(null);
  };

  const deleteHistoryItem = (id: string) => {
    setHistory((prev) => prev.filter((h) => h.id !== id));
    if (selectedHistId === id) setSelectedHistId(undefined);
  };

  const clearHistory = () => {
    setHistory([]);
    setSelectedHistId(undefined);
  };

  const handlePrettify = () => {
    saveToHistory(input);
    try {
      const parsed = JSON.parse(input);
      const norm = sortKeys ? sortObject(parsed) : parsed;
      setOutput(JSON.stringify(norm, null, indent));
      setParseErr(null);
    } catch (e: any) {
      const pos = extractPosFromError(e);
      if (pos != null) {
        const { line, col } = locate(input, pos);
        setParseErr({ message: String(e.message), pos, line, col, excerpt: mkExcerpt(input, pos) });
        message.error(`JSON error at ${line}:${col}`);
      } else {
        setParseErr({ message: String(e.message), pos: -1, line: -1, col: -1, excerpt: "" });
        message.error("JSON error");
      }
    }
  };

  const handleMinify = () => {
    saveToHistory(input);
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed));
      setParseErr(null);
    } catch (e: any) {
      const pos = extractPosFromError(e);
      if (pos != null) {
        const { line, col } = locate(input, pos);
        setParseErr({ message: String(e.message), pos, line, col, excerpt: mkExcerpt(input, pos) });
        message.error(`JSON error at ${line}:${col}`);
      } else {
        setParseErr({ message: String(e.message), pos: -1, line: -1, col: -1, excerpt: "" });
        message.error("JSON error");
      }
    }
  };

  const handleCopy = async () => {
    const text = output || input;
    if (!text) return;
    await navigator.clipboard.writeText(text);
    message.success("Copied");
  };

  const handleDownload = () => {
    const blob = new Blob([output || input], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const beforeUpload = async (file: File) => {
    const text = await file.text();
    setInput(text);
    message.success(`Loaded: ${file.name}`);
    return false;
  };

  const previewNode = useMemo(() => {
    if (!output) return null;
    if (!highlight)
      return <TextArea value={output} readOnly autoSize={{ minRows: 8 }} spellCheck={false} />;

    return (
      <SyntaxHighlighter
        language="json"
        style={vscDarkPlus}
        wrapLongLines
        customStyle={{ background: "transparent", margin: 0, padding: 12, borderRadius: 8 }}
      >
        {output}
      </SyntaxHighlighter>
    );
  }, [output, highlight]);

  return (
    <Card title="Generators · JSON Prettify" bordered>
      <Space direction="vertical" style={{ width: "100%" }} size="large">
        {/* Controls */}
        <Space wrap>
          <Upload beforeUpload={beforeUpload} accept=".json,.txt,application/json" maxCount={1} showUploadList={false}>
            <Button icon={<UploadOutlined />}>Load file</Button>
          </Upload>
          <Button type="primary" onClick={handlePrettify} disabled={prettyDisabled}>
            Prettify
          </Button>
          <Button onClick={handleMinify} icon={<ScissorOutlined />} disabled={prettyDisabled}>
            Minify
          </Button>
          <Button onClick={handleCopy} icon={<CopyOutlined />} disabled={!input && !output}>
            Copy
          </Button>
          <Button onClick={handleDownload} icon={<DownloadOutlined />} disabled={!input && !output}>
            Download
          </Button>
          <Button onClick={() => saveToHistory()} icon={<SaveOutlined />} disabled={!input.trim()}>
            Save to history
          </Button>
        </Space>

        {/* Options */}
        <Space wrap>
          <Typography.Text>Indent:</Typography.Text>
          <Select
            value={indent}
            onChange={(v) => setIndent(v)}
            options={[0, 2, 4, 6, 8].map((n) => ({ value: n, label: String(n) }))}
            style={{ width: 96 }}
          />
          <Typography.Text>Sort keys:</Typography.Text>
          <Switch checked={sortKeys} onChange={setSortKeys} />
          <Typography.Text>Syntax highlight:</Typography.Text>
          <Switch checked={highlight} onChange={setHighlight} />
        </Space>

        {/* History */}
        <Space direction="vertical" style={{ width: "100%" }}>
          <Typography.Text>History (last {HISTORY_LIMIT}):</Typography.Text>
          <Space wrap style={{ width: "100%" }}>
            <Select
              placeholder="Select a previous input"
              value={selectedHistId}
              onChange={loadFromHistory}
              options={history.map((h) => ({ value: h.id, label: makeLabel(h.value, h.ts) }))}
              style={{ minWidth: 360, flex: 1 }}
              showSearch
              optionFilterProp="label"
            />
            <Button
              icon={<DeleteOutlined />}
              danger
              disabled={!selectedHistId}
              onClick={() => selectedHistId && deleteHistoryItem(selectedHistId)}
            >
              Delete selected
            </Button>
            <Button danger onClick={clearHistory} disabled={!history.length}>
              Clear all
            </Button>
          </Space>
        </Space>

        {/* Input */}
        <TextArea
          status={parseErr ? "error" : undefined}
          placeholder="Paste raw JSON here"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (parseErr) setParseErr(null);
          }}
          autoSize={{ minRows: 8 }}
          spellCheck={false}
        />

        {/* Error */}
        {parseErr && (
          <Card
            size="small"
            title={`Parse error${parseErr.line > 0 ? ` at ${parseErr.line}:${parseErr.col}` : ""}`}
            bordered
          >
            <Typography.Paragraph style={{ whiteSpace: "pre-wrap", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
              {parseErr.message}
            </Typography.Paragraph>
            {parseErr.excerpt && (
              <pre style={{ whiteSpace: "pre-wrap", overflowX: "auto", margin: 0 }}>
                {parseErr.excerpt}
              </pre>
            )}
          </Card>
        )}

        {/* Output */}
        {output && (
          <Card size="small" title="Output" bordered>
            {previewNode}
          </Card>
        )}
      </Space>
    </Card>
  );
}
