import { useState } from "react";
import { formatJsonString } from "./agentMemoryFormat";

type Props = {
  source: string;
  maxLines?: number;
  emptyLabel?: string;
};

export default function AgentMemoryJsonBlock({
  source,
  maxLines = 10,
  emptyLabel = "—",
}: Props) {
  const { text, isJson } = formatJsonString(source);
  const [expanded, setExpanded] = useState(false);

  if (!text) {
    return <span className="agent-memory__code-empty">{emptyLabel}</span>;
  }

  const lines = text.split("\n");
  const collapsible = lines.length > maxLines;
  const display =
    expanded || !collapsible
      ? text
      : `${lines.slice(0, maxLines).join("\n")}\n…`;

  return (
    <div className="agent-memory__code-wrap">
      <pre
        className={
          isJson
            ? "agent-memory__code agent-memory__code--json"
            : "agent-memory__code"
        }
      >
        {display}
      </pre>
      {collapsible ? (
        <button
          type="button"
          className="agent-memory__code-toggle"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Collapse" : `Show all (${lines.length} lines)`}
        </button>
      ) : null}
    </div>
  );
}
