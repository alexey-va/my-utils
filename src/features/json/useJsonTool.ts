import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { message } from "antd";
import {
  JSON_HISTORY_KEY,
  JSON_HISTORY_LIMIT,
  JSON_STORE_KEY,
  formatJson,
  loadJsonToolSnapshot,
  makeHistoryLabel,
  pushHistory,
  type HistItem,
  type JsonFormatMode,
} from "./jsonUtils";

export function useJsonTool() {
  const [initial] = useState(loadJsonToolSnapshot);
  const [input, setInput] = useState(initial.input);
  const [formatMode, setFormatMode] = useState<JsonFormatMode>(initial.formatMode);
  const [indent, setIndent] = useState(initial.indent);
  const [sortKeys, setSortKeys] = useState(initial.sortKeys);
  const [highlight, setHighlight] = useState(initial.highlight);
  const [history, setHistory] = useState<HistItem[]>(initial.history);
  const [selectedHistId, setSelectedHistId] = useState<string>();
  const persistReady = useRef(false);

  const { output, parseErr } = useMemo(
    () => formatJson(input, { indent, sortKeys, mode: formatMode }),
    [input, indent, sortKeys, formatMode],
  );

  useEffect(() => {
    persistReady.current = true;
  }, []);

  useEffect(() => {
    if (!persistReady.current) {
      return;
    }
    localStorage.setItem(
      JSON_STORE_KEY,
      JSON.stringify({ input, indent, sortKeys, highlight, formatMode }),
    );
  }, [input, indent, sortKeys, highlight, formatMode]);

  useEffect(() => {
    if (!persistReady.current) {
      return;
    }
    localStorage.setItem(JSON_HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  const saveToHistory = useCallback(
    (src?: string) => {
      const val = (src ?? input).trim();
      if (!val) {
        return;
      }
      setHistory((prev) => pushHistory(prev, val));
    },
    [input],
  );

  const prettify = useCallback(() => {
    setFormatMode("pretty");
    saveToHistory(input);
  }, [input, saveToHistory]);

  const minify = useCallback(() => {
    setFormatMode("minify");
    saveToHistory(input);
  }, [input, saveToHistory]);

  const loadFromHistory = useCallback(
    (id: string) => {
      const item = history.find((h) => h.id === id);
      if (!item) {
        return;
      }
      setHistory((prev) => pushHistory(prev, input));
      setInput(item.value);
      setSelectedHistId(id);
    },
    [history, input],
  );

  const deleteHistoryItem = useCallback((id: string) => {
    setHistory((prev) => prev.filter((h) => h.id !== id));
    setSelectedHistId((cur) => (cur === id ? undefined : cur));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setSelectedHistId(undefined);
  }, []);

  const handleCopy = useCallback(async () => {
    const text = output || input;
    if (!text) {
      return;
    }
    await navigator.clipboard.writeText(text);
    message.success("Copied");
  }, [input, output]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([output || input], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [input, output]);

  const beforeUpload = useCallback(async (file: File) => {
    setInput(await file.text());
    message.success(`Loaded: ${file.name}`);
    return false;
  }, []);

  const historyOptions = history.map((h) => ({
    value: h.id,
    label: makeHistoryLabel(h.value, h.ts),
  }));

  return {
    input,
    setInput,
    output,
    formatMode,
    indent,
    setIndent,
    sortKeys,
    setSortKeys,
    highlight,
    setHighlight,
    parseErr,
    history,
    selectedHistId,
    historyLimit: JSON_HISTORY_LIMIT,
    historyOptions,
    hasInput: Boolean(input.trim()),
    hasContent: Boolean(input || output),
    saveToHistory,
    loadFromHistory,
    deleteHistoryItem,
    clearHistory,
    prettify,
    minify,
    handleCopy,
    handleDownload,
    beforeUpload,
  };
}
