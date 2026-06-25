import { Button, Switch, Tag, Tooltip } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import type { AgentMemoryMessage } from "../../api/agentMemory";
import AgentMemoryJsonBlock from "./AgentMemoryJsonBlock";
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

function MessageActions({
  row,
  togglingMessageId,
  onToggleExcluded,
  onDeleteMessage,
}: {
  row: AgentMemoryMessage;
  togglingMessageId: number | null;
  onToggleExcluded: (row: AgentMemoryMessage, excluded: boolean) => void;
  onDeleteMessage: (messageId: number) => void;
}) {
  return (
    <div className="agent-memory__message-actions">
      <Tooltip title={row.excludedFromContext ? "Excluded from context" : "Included in context"}>
        <Switch
          size="small"
          checked={row.excludedFromContext}
          loading={togglingMessageId === row.id}
          onChange={(checked) => onToggleExcluded(row, checked)}
          checkedChildren="skip"
          unCheckedChildren="ctx"
        />
      </Tooltip>
      <Tooltip title="Delete message">
        <Button
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          aria-label="Delete message"
          onClick={() => onDeleteMessage(row.id)}
        />
      </Tooltip>
    </div>
  );
}

function messageModifierClasses(row: AgentMemoryMessage): string {
  let classes = "";
  if (row.excludedFromContext) {
    classes += " agent-memory__message--excluded";
  }
  if (row.compactedIntoSummaryId) {
    classes += " agent-memory__message--compacted";
  }
  return classes;
}

function CompactedTag({ row }: { row: AgentMemoryMessage }) {
  if (!row.compactedIntoSummaryId) return null;
  return (
    <Tag className="agent-memory__message-tag" color="purple">
      compacted
    </Tag>
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
  const roleClass = `agent-memory__message--${row.role}`;
  const modifierClasses = messageModifierClasses(row);

  if (row.role === "tool") {
    const toolName = parsed.toolName ?? "tool";
    const resultSource = parsed.content ?? row.rawJson;

    return (
      <li className={`agent-memory__message ${roleClass}${modifierClasses}`}>
        <div className="agent-memory__message-head">
          <span className="agent-memory__role agent-memory__role--tool">Tool result</span>
          <span className="agent-memory__tool-name-inline">{toolName}</span>
          {parsed.toolCallId ? (
            <span className="agent-memory__tool-id-inline">{shortToolCallId(parsed.toolCallId)}</span>
          ) : null}
          <time className="agent-memory__message-time">{formatTime(row.createdAt)}</time>
          <CompactedTag row={row} />
        </div>
        <div className="agent-memory__tool-section">
          <span className="agent-memory__tool-label">Output</span>
          <AgentMemoryJsonBlock source={resultSource} />
        </div>
        <MessageActions
          row={row}
          togglingMessageId={togglingMessageId}
          onToggleExcluded={onToggleExcluded}
          onDeleteMessage={onDeleteMessage}
        />
      </li>
    );
  }

  const text = parsed.content?.trim();
  const showRaw = !text && row.rawJson;

  return (
    <li className={`agent-memory__message ${roleClass}${modifierClasses}`}>
      <div className="agent-memory__message-head">
        <span className="agent-memory__role">{roleLabel(row.role)}</span>
        <time className="agent-memory__message-time">{formatTime(row.createdAt)}</time>
        <CompactedTag row={row} />
      </div>
      {text ? <p className="agent-memory__message-text">{text}</p> : null}
      {showRaw ? (
        <div className="agent-memory__tool-section">
          <span className="agent-memory__tool-label">Raw</span>
          <AgentMemoryJsonBlock source={row.rawJson} maxLines={8} />
        </div>
      ) : null}
      <MessageActions
        row={row}
        togglingMessageId={togglingMessageId}
        onToggleExcluded={onToggleExcluded}
        onDeleteMessage={onDeleteMessage}
      />
    </li>
  );
}

function roleLabel(role: string): string {
  switch (role) {
    case "user":
      return "User";
    case "assistant":
      return "Assistant";
    case "system":
      return "System";
    default:
      return role;
  }
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

  const modifierClasses = messageModifierClasses(assistant);
  const assistantText = parsed.content?.trim();

  return (
    <li className={`agent-memory__tool-round${modifierClasses}`}>
      <div className="agent-memory__tool-round-head">
        <span className="agent-memory__role">Assistant</span>
        <Tag className="agent-memory__tool-round-badge" color="orange">
          {parsed.toolCalls.length} tool{parsed.toolCalls.length === 1 ? "" : "s"}
        </Tag>
        <time className="agent-memory__message-time">{formatTime(assistant.createdAt)}</time>
        <CompactedTag row={assistant} />
      </div>

      {assistantText ? (
        <>
          <p className="agent-memory__message-text agent-memory__tool-round-preamble">{assistantText}</p>
          <MessageActions
            row={assistant}
            togglingMessageId={togglingMessageId}
            onToggleExcluded={onToggleExcluded}
            onDeleteMessage={onDeleteMessage}
          />
        </>
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
                <MessageActions
                  row={toolRow}
                  togglingMessageId={togglingMessageId}
                  onToggleExcluded={onToggleExcluded}
                  onDeleteMessage={onDeleteMessage}
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
                <MessageActions
                  row={toolRow}
                  togglingMessageId={togglingMessageId}
                  onToggleExcluded={onToggleExcluded}
                  onDeleteMessage={onDeleteMessage}
                />
              </li>
            );
          })}
      </ul>
    </li>
  );
}
