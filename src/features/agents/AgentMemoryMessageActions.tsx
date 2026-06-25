import { Button, Tooltip } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import type { AgentMemoryMessage } from "../../api/agentMemory";

type Props = {
  row: AgentMemoryMessage;
  loading: boolean;
  onToggleExcluded: (row: AgentMemoryMessage, excluded: boolean) => void;
  onDeleteMessage: (messageId: number) => void;
  className?: string;
};

export default function AgentMemoryMessageActions({
  row,
  loading,
  onToggleExcluded,
  onDeleteMessage,
  className,
}: Props) {
  const included = !row.excludedFromContext;
  const rootClass = className
    ? `agent-memory__chat-actions ${className}`
    : "agent-memory__chat-actions";

  return (
    <div className={rootClass}>
      <Tooltip
        title={
          included
            ? "В контексте LLM — нажми skip, чтобы исключить"
            : "Исключено из контекста — нажми ctx, чтобы включить"
        }
      >
        <div className="agent-memory__ctx-pill" role="group" aria-label="Context inclusion">
          <button
            type="button"
            className={
              included
                ? "agent-memory__ctx-pill-opt agent-memory__ctx-pill-opt--active"
                : "agent-memory__ctx-pill-opt"
            }
            disabled={loading}
            aria-pressed={included}
            onClick={() => {
              if (!included) onToggleExcluded(row, false);
            }}
          >
            ctx
          </button>
          <button
            type="button"
            className={
              !included
                ? "agent-memory__ctx-pill-opt agent-memory__ctx-pill-opt--active agent-memory__ctx-pill-opt--skip"
                : "agent-memory__ctx-pill-opt"
            }
            disabled={loading}
            aria-pressed={!included}
            onClick={() => {
              if (included) onToggleExcluded(row, true);
            }}
          >
            skip
          </button>
        </div>
      </Tooltip>
      <Tooltip title="Удалить сообщение">
        <Button
          type="text"
          size="small"
          className="agent-memory__chat-action-btn agent-memory__chat-action-btn--delete"
          danger
          icon={<DeleteOutlined />}
          aria-label="Delete message"
          onClick={() => onDeleteMessage(row.id)}
        />
      </Tooltip>
    </div>
  );
}
