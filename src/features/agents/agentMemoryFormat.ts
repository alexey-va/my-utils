import type { AgentMemoryMessage } from "../../api/agentMemory";

export type ParsedToolCall = {
  id: string;
  name: string;
  arguments: string;
};

export type ParsedChatMessage = {
  role: string;
  content: string | null;
  images: string[];
  toolCalls: ParsedToolCall[];
  toolCallId: string | null;
  toolName: string | null;
};

export type HistoryItem =
  | { kind: "message"; message: AgentMemoryMessage }
  | { kind: "tool-round"; assistant: AgentMemoryMessage; tools: AgentMemoryMessage[] };

export function parseStoredMessage(msg: AgentMemoryMessage): ParsedChatMessage {
  try {
    const raw = JSON.parse(msg.rawJson) as Record<string, unknown>;
    const images = parseImages(raw.images) ?? msg.images ?? [];
    return {
      role: typeof raw.role === "string" ? raw.role : msg.role,
      content: extractTextContent(raw.content) ?? (raw.content != null ? String(raw.content) : msg.content),
      images,
      toolCalls: parseToolCalls(raw.tool_calls),
      toolCallId:
        raw.tool_call_id != null ? String(raw.tool_call_id) : msg.toolCallId,
      toolName: raw.name != null ? String(raw.name) : msg.toolName,
    };
  } catch {
    return {
      role: msg.role,
      content: msg.content,
      images: msg.images ?? [],
      toolCalls: [],
      toolCallId: msg.toolCallId,
      toolName: msg.toolName,
    };
  }
}

function parseImages(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) {
    return null;
  }
  const images = raw
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.startsWith("data:image/"));
  return images.length > 0 ? images : null;
}

function extractTextContent(raw: unknown): string | null {
  if (raw == null) {
    return null;
  }
  if (typeof raw === "string") {
    return raw;
  }
  if (!Array.isArray(raw)) {
    return String(raw);
  }
  const parts = raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const block = entry as Record<string, unknown>;
      if (block.type === "text" && typeof block.text === "string") {
        return block.text;
      }
      return null;
    })
    .filter((part): part is string => part != null);
  return parts.length > 0 ? parts.join("\n") : null;
}

function parseToolCalls(raw: unknown): ParsedToolCall[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      const tc = entry as Record<string, unknown>;
      const fn = tc.function as Record<string, unknown> | undefined;
      const id = tc.id != null ? String(tc.id) : "";
      if (!id) return null;
      return {
        id,
        name: fn?.name != null ? String(fn.name) : "tool",
        arguments: fn?.arguments != null ? String(fn.arguments) : "{}",
      };
    })
    .filter((tc): tc is ParsedToolCall => tc != null);
}

export function formatJsonString(source: string): { text: string; isJson: boolean } {
  const trimmed = source.trim();
  if (!trimmed) return { text: "", isJson: false };
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return { text: JSON.stringify(parsed, null, 2), isJson: true };
  } catch {
    return { text: source, isJson: false };
  }
}

/** Group assistant tool_calls + following tool results; chronological order (oldest first). */
export function groupHistoryMessages(messages: AgentMemoryMessage[]): HistoryItem[] {
  const asc = [...messages].sort((a, b) => a.id - b.id);
  const groups: HistoryItem[] = [];
  let index = 0;

  while (index < asc.length) {
    const msg = asc[index];
    const parsed = parseStoredMessage(msg);

    if (msg.role === "assistant" && parsed.toolCalls.length > 0) {
      const tools: AgentMemoryMessage[] = [];
      let next = index + 1;
      while (next < asc.length && asc[next].role === "tool") {
        tools.push(asc[next]);
        next += 1;
      }
      groups.push({ kind: "tool-round", assistant: msg, tools });
      index = next;
      continue;
    }

    groups.push({ kind: "message", message: msg });
    index += 1;
  }

  return groups;
}

export function shortToolCallId(id: string): string {
  if (id.length <= 10) return id;
  return `${id.slice(0, 8)}…`;
}
