import { useState } from "react";
import { Button, Tag, Tooltip } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import type { AgentMemoryMessage } from "../../api/agentMemory";
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
  const excludedClass = row.excludedFromContext ? " agent-memory__message--excluded" : "";
  const compactedClass =
    row.isCompacted || row.compactedIntoSummaryId
      ? " agent-memory__message--compacted"
      : "";

  return (
    <li className={`agent-memory__system-item${excludedClass}${compactedClass}`}>
      <div className="agent-memory__system-item-head">
        <time className="agent-memory__message-time">{formatTime(row.createdAt)}</time>
        {row.compactedIntoSummaryId || row.isCompacted ? (
          <Tag className="agent-memory__message-tag" color="purple">compacted</Tag>
        ) : null}
        <div className="agent-memory__system-item-actions">
          <Tooltip title={row.excludedFromContext ? "Excluded from context" : "Included in context"}>
            <Button
              type="text"
              size="small"
              loading={togglingMessageId === row.id}
              onClick={() => onToggleExcluded(row, !row.excludedFromContext)}
            >
              {row.excludedFromContext ? "skip" : "ctx"}
            </Button>
          </Tooltip>
          <Tooltip title="Delete message">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              aria-label="Delete system message"
              onClick={() => onDeleteMessage(row.id)}
            />
          </Tooltip>
        </div>
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
