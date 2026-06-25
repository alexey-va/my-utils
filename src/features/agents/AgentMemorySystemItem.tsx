import { useState } from "react";
import { Tag } from "antd";
import type { AgentMemoryMessage } from "../../api/agentMemory";
import AgentMemoryMessageActions from "./AgentMemoryMessageActions";
import { parseStoredMessage } from "./agentMemoryFormat";

type Props = {
  row: AgentMemoryMessage;
  formatTime: (value: string | null) => string;
  togglingMessageId: number | null;
  onToggleExcluded: (row: AgentMemoryMessage, excluded: boolean) => void;
  onDeleteMessage: (messageId: number) => void;
};

const PREVIEW_CHARS = 160;

export default function AgentMemorySystemItem({
  row,
  formatTime,
  togglingMessageId,
  onToggleExcluded,
  onDeleteMessage,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const parsed = parseStoredMessage(row);
  const text = parsed.content?.trim() ?? "";
  const collapsible = text.length > PREVIEW_CHARS;
  const preview = collapsible && !expanded ? `${text.slice(0, PREVIEW_CHARS)}…` : text;
  const modifierClasses = [
    row.excludedFromContext ? " agent-memory__system-item--excluded" : "",
    row.isCompacted || row.compactedIntoSummaryId ? " agent-memory__system-item--compacted" : "",
  ].join("");

  return (
    <li className={`agent-memory__system-item${modifierClasses}`}>
      <div className="agent-memory__system-item-head">
        <time className="agent-memory__chat-time-inline">{formatTime(row.createdAt)}</time>
        {row.compactedIntoSummaryId || row.isCompacted ? (
          <Tag className="agent-memory__chat-tag" color="purple">compacted</Tag>
        ) : null}
        <AgentMemoryMessageActions
          row={row}
          loading={togglingMessageId === row.id}
          onToggleExcluded={onToggleExcluded}
          onDeleteMessage={onDeleteMessage}
          className="agent-memory__chat-actions--inline"
        />
      </div>
      {text ? <p className="agent-memory__system-item-text">{preview}</p> : null}
      {collapsible ? (
        <button
          type="button"
          className="agent-memory__code-toggle"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Скрыть" : "Показать полностью"}
        </button>
      ) : null}
    </li>
  );
}
