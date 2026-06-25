import { Tag } from "antd";
import { RobotOutlined, ToolOutlined, UserOutlined } from "@ant-design/icons";
import type { AgentMemoryMessage } from "../../api/agentMemory";
import AgentMemoryJsonBlock from "./AgentMemoryJsonBlock";
import AgentMemoryMessageActions from "./AgentMemoryMessageActions";
import {
  type HistoryItem,
  parseStoredMessage,
  shortToolCallId,
} from "./agentMemoryFormat";

type Props = {
  item: HistoryItem;
  formatTime: (value: string | null) => string;
  togglingMessageId: number | null;
  onToggleExcluded: (row: AgentMemoryMessage, excluded: boolean) => void;
  onDeleteMessage: (messageId: number) => void;
};

function isCompactedMessage(row: AgentMemoryMessage): boolean {
  return row.isCompacted || row.compactedIntoSummaryId != null;
}

function rowModifierClasses(row: AgentMemoryMessage): string {
  let classes = "";
  if (row.excludedFromContext) {
    classes += " agent-memory__chat-row--excluded";
  }
  if (isCompactedMessage(row)) {
    classes += " agent-memory__chat-row--compacted";
  }
  return classes;
}

function CompactedTag({ row }: { row: AgentMemoryMessage }) {
  if (!isCompactedMessage(row)) return null;
  return (
    <Tag className="agent-memory__chat-tag" color="purple">
      compacted
    </Tag>
  );
}

function ChatAvatar({ kind }: { kind: "user" | "assistant" | "tool" }) {
  if (kind === "user") {
    return (
      <div className="agent-memory__chat-avatar agent-memory__chat-avatar--user" aria-hidden>
        <UserOutlined />
      </div>
    );
  }
  if (kind === "tool") {
    return (
      <div className="agent-memory__chat-avatar agent-memory__chat-avatar--tool" aria-hidden>
        <ToolOutlined />
      </div>
    );
  }
  return (
    <div className="agent-memory__chat-avatar agent-memory__chat-avatar--assistant" aria-hidden>
      <RobotOutlined />
    </div>
  );
}

function ChatMeta({
  label,
  time,
  row,
}: {
  label: string;
  time: string;
  row: AgentMemoryMessage;
}) {
  return (
    <div className="agent-memory__chat-meta">
      <span className="agent-memory__chat-label">{label}</span>
      <time className="agent-memory__chat-time-inline">{time}</time>
      <CompactedTag row={row} />
    </div>
  );
}

function SimpleMessageBody({
  row,
  formatTime,
  togglingMessageId,
  onToggleExcluded,
  onDeleteMessage,
}: {
  row: AgentMemoryMessage;
  formatTime: (value: string | null) => string;
  togglingMessageId: number | null;
  onToggleExcluded: (row: AgentMemoryMessage, excluded: boolean) => void;
  onDeleteMessage: (messageId: number) => void;
}) {
  const parsed = parseStoredMessage(row);
  const modifierClasses = rowModifierClasses(row);
  const time = formatTime(row.createdAt);
  const loading = togglingMessageId === row.id;

  if (row.role === "tool") {
    const toolName = parsed.toolName ?? "tool";
    const resultSource = parsed.content ?? row.rawJson;

    return (
      <li className={`agent-memory__chat-row agent-memory__chat-row--tool${modifierClasses}`}>
        <ChatAvatar kind="tool" />
        <div className="agent-memory__chat-body">
          <ChatMeta label="Tool result" time={time} row={row} />
          <div className="agent-memory__chat-tool-inline">
            <span className="agent-memory__tool-name-inline">{toolName}</span>
            {parsed.toolCallId ? (
              <span className="agent-memory__tool-id-inline">{shortToolCallId(parsed.toolCallId)}</span>
            ) : null}
          </div>
          <div className="agent-memory__tool-section">
            <span className="agent-memory__tool-label">Output</span>
            <AgentMemoryJsonBlock source={resultSource} />
          </div>
        </div>
        <AgentMemoryMessageActions
          row={row}
          loading={loading}
          onToggleExcluded={onToggleExcluded}
          onDeleteMessage={onDeleteMessage}
        />
      </li>
    );
  }

  const text = parsed.content?.trim();
  const showRaw = !text && row.rawJson;
  const isUser = row.role === "user";
  const rowClass = isUser
    ? `agent-memory__chat-row agent-memory__chat-row--user${modifierClasses}`
    : `agent-memory__chat-row agent-memory__chat-row--assistant${modifierClasses}`;

  if (isUser) {
    return (
      <li className={rowClass}>
        <div className="agent-memory__user-bundle">
          <ChatAvatar kind="user" />
          <div className="agent-memory__chat-body">
            {text ? (
              <div className="agent-memory__chat-bubble agent-memory__chat-bubble--user">
                <p className="agent-memory__chat-text">{text}</p>
                <time className="agent-memory__chat-bubble-time">{time}</time>
              </div>
            ) : null}
            {showRaw ? (
              <div className="agent-memory__tool-section">
                <span className="agent-memory__tool-label">Raw</span>
                <AgentMemoryJsonBlock source={row.rawJson} maxLines={8} />
              </div>
            ) : null}
            {isCompactedMessage(row) ? (
              <div className="agent-memory__chat-meta agent-memory__chat-meta--user">
                <CompactedTag row={row} />
              </div>
            ) : null}
          </div>
        </div>
        <AgentMemoryMessageActions
          row={row}
          loading={loading}
          onToggleExcluded={onToggleExcluded}
          onDeleteMessage={onDeleteMessage}
        />
      </li>
    );
  }

  return (
    <li className={rowClass}>
      <ChatAvatar kind="assistant" />
      <div className="agent-memory__chat-body">
        <ChatMeta label="Assistant" time={time} row={row} />
        {text ? (
          <div className="agent-memory__chat-bubble">
            <p className="agent-memory__chat-text">{text}</p>
          </div>
        ) : null}
        {showRaw ? (
          <div className="agent-memory__tool-section">
            <span className="agent-memory__tool-label">Raw</span>
            <AgentMemoryJsonBlock source={row.rawJson} maxLines={8} />
          </div>
        ) : null}
      </div>
      <AgentMemoryMessageActions
        row={row}
        loading={loading}
        onToggleExcluded={onToggleExcluded}
        onDeleteMessage={onDeleteMessage}
      />
    </li>
  );
}

export default function AgentMemoryHistoryItem({
  item,
  formatTime,
  togglingMessageId,
  onToggleExcluded,
  onDeleteMessage,
}: Props) {
  if (item.kind === "message") {
    return (
      <SimpleMessageBody
        row={item.message}
        formatTime={formatTime}
        togglingMessageId={togglingMessageId}
        onToggleExcluded={onToggleExcluded}
        onDeleteMessage={onDeleteMessage}
      />
    );
  }

  const { assistant, tools } = item;
  const parsed = parseStoredMessage(assistant);
  const matchedToolIds = new Set<number>();
  const toolByCallId = new Map<string, AgentMemoryMessage>();

  for (const toolRow of tools) {
    const toolParsed = parseStoredMessage(toolRow);
    const key = toolParsed.toolCallId?.trim();
    if (key) {
      toolByCallId.set(key, toolRow);
    }
  }

  const modifierClasses = rowModifierClasses(assistant);
  const assistantText = parsed.content?.trim();
  const assistantLoading = togglingMessageId === assistant.id;
  const time = formatTime(assistant.createdAt);

  return (
    <li className={`agent-memory__chat-row agent-memory__chat-row--assistant agent-memory__chat-row--tools${modifierClasses}`}>
      <ChatAvatar kind="assistant" />
      <div className="agent-memory__chat-body">
        <ChatMeta label="Assistant" time={time} row={assistant} />
        {parsed.toolCalls.length > 0 ? (
          <Tag className="agent-memory__chat-tag agent-memory__chat-tag--tools" color="orange">
            {parsed.toolCalls.length} tool{parsed.toolCalls.length === 1 ? "" : "s"}
          </Tag>
        ) : null}

        {assistantText ? (
          <div className="agent-memory__chat-bubble">
            <p className="agent-memory__chat-text">{assistantText}</p>
          </div>
        ) : null}

        {assistantText ? (
          <AgentMemoryMessageActions
            row={assistant}
            loading={assistantLoading}
            onToggleExcluded={onToggleExcluded}
            onDeleteMessage={onDeleteMessage}
            className="agent-memory__chat-actions--inline"
          />
        ) : null}

        <ul className="agent-memory__tool-calls">
          {parsed.toolCalls.map((call) => {
            const toolRow = toolByCallId.get(call.id);
            if (toolRow) {
              matchedToolIds.add(toolRow.id);
            }
            const resultSource = toolRow
              ? (parseStoredMessage(toolRow).content ?? toolRow.rawJson)
              : "";
            const toolLoading = toolRow != null && togglingMessageId === toolRow.id;

            return (
              <li key={call.id} className="agent-memory__tool-call">
                <div className="agent-memory__tool-call-head">
                  <span className="agent-memory__tool-name">{call.name}</span>
                  <span className="agent-memory__tool-id">{shortToolCallId(call.id)}</span>
                </div>
                <div className="agent-memory__tool-section">
                  <span className="agent-memory__tool-label">Arguments</span>
                  <AgentMemoryJsonBlock source={call.arguments} maxLines={8} />
                </div>
                {toolRow ? (
                  <div className="agent-memory__tool-section">
                    <span className="agent-memory__tool-label">Result</span>
                    <AgentMemoryJsonBlock source={resultSource} maxLines={12} />
                  </div>
                ) : (
                  <p className="agent-memory__tool-missing">No result stored for this call.</p>
                )}
                {toolRow ? (
                  <AgentMemoryMessageActions
                    row={toolRow}
                    loading={toolLoading}
                    onToggleExcluded={onToggleExcluded}
                    onDeleteMessage={onDeleteMessage}
                    className="agent-memory__chat-actions--inline"
                  />
                ) : null}
              </li>
            );
          })}
          {tools
            .filter((toolRow) => !matchedToolIds.has(toolRow.id))
            .map((toolRow) => {
              const toolParsed = parseStoredMessage(toolRow);
              const resultSource = toolParsed.content ?? toolRow.rawJson;
              const toolLoading = togglingMessageId === toolRow.id;

              return (
                <li key={toolRow.id} className="agent-memory__tool-call agent-memory__tool-call--orphan">
                  <div className="agent-memory__tool-call-head">
                    <span className="agent-memory__tool-name">{toolParsed.toolName ?? "tool"}</span>
                    {toolParsed.toolCallId ? (
                      <span className="agent-memory__tool-id">{shortToolCallId(toolParsed.toolCallId)}</span>
                    ) : null}
                    <span className="agent-memory__tool-orphan-label">orphan result</span>
                  </div>
                  <div className="agent-memory__tool-section">
                    <span className="agent-memory__tool-label">Output</span>
                    <AgentMemoryJsonBlock source={resultSource} maxLines={12} />
                  </div>
                  <AgentMemoryMessageActions
                    row={toolRow}
                    loading={toolLoading}
                    onToggleExcluded={onToggleExcluded}
                    onDeleteMessage={onDeleteMessage}
                    className="agent-memory__chat-actions--inline"
                  />
                </li>
              );
            })}
        </ul>
      </div>
      {!assistantText ? (
        <AgentMemoryMessageActions
          row={assistant}
          loading={assistantLoading}
          onToggleExcluded={onToggleExcluded}
          onDeleteMessage={onDeleteMessage}
        />
      ) : null}
    </li>
  );
}
