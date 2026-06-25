import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Button,
  Empty,
  Input,
  Modal,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import {
  compactAgentMemory,
  clearAgentDialog,
  createAgentFact,
  deleteAgentFact,
  deleteAgentMessage,
  fetchAgentMemoryChat,
  fetchAgentMemoryChats,
  fetchAgentMemoryMessages,
  resetAgentCompaction,
  updateAgentFact,
  updateMessageExcluded,
  type AgentMemoryChatDetail,
  type AgentMemoryChatSummary,
  type AgentMemoryMessage,
} from "../../api/agentMemory";
import { ApiError } from "../../api/errors";
import AgentMemoryHistoryItem from "./AgentMemoryHistoryItem";
import { compactSkipReasonMessage, compactionHint } from "./agentMemoryCompaction";
import { groupHistoryMessages } from "./agentMemoryFormat";

function formatTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MemorySection({
  title,
  meta,
  children,
  className,
}: {
  title: string;
  meta?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className ? `agent-memory__section ${className}` : "agent-memory__section"}>
      <header className="agent-memory__section-head">
        <h3 className="agent-memory__section-title">{title}</h3>
        {meta ? <span className="agent-memory__section-meta">{meta}</span> : null}
      </header>
      <div className="agent-memory__section-body">{children}</div>
    </section>
  );
}

export default function AgentMemoryPage() {
  const [chats, setChats] = useState<AgentMemoryChatSummary[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [detail, setDetail] = useState<AgentMemoryChatDetail | null>(null);
  const [history, setHistory] = useState<AgentMemoryMessage[]>([]);
  const [nextBeforeId, setNextBeforeId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [factDraft, setFactDraft] = useState("");
  const [editingFactId, setEditingFactId] = useState<string | null>(null);
  const [editingFactContent, setEditingFactContent] = useState("");

  const [apiError, setApiError] = useState<string | null>(null);
  const [togglingMessageId, setTogglingMessageId] = useState<number | null>(null);
  const [compacting, setCompacting] = useState(false);

  const loadChats = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
    }
    setApiError(null);
    try {
      const rows = await fetchAgentMemoryChats();
      setChats(rows);
      setSelectedChatId((current) => current ?? rows[0]?.chatId ?? null);
    } catch (error) {
      const msg = error instanceof ApiError ? `${error.status}: ${error.message}` : "Failed to load chats";
      setApiError(msg);
      message.error(msg);
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, []);

  const loadChat = useCallback(async (chatId: number) => {
    try {
      const chatDetail = await fetchAgentMemoryChat(chatId);
      setDetail(chatDetail);
      const page = await fetchAgentMemoryMessages(chatId);
      setHistory(page.messages);
      setNextBeforeId(page.nextBeforeId);
    } catch (error) {
      message.error(error instanceof ApiError ? error.message : "Failed to load chat");
    }
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  useEffect(() => {
    if (selectedChatId != null) {
      loadChat(selectedChatId);
    }
  }, [selectedChatId, loadChat]);

  const refreshChat = async () => {
    if (selectedChatId != null) {
      await loadChat(selectedChatId);
    }
  };

  const refreshAll = async () => {
    await loadChats({ silent: true });
    await refreshChat();
  };

  const onManualCompact = async () => {
    if (selectedChatId == null) return;
    setCompacting(true);
    try {
      const result = await compactAgentMemory(selectedChatId, true);
      if (result.compacted) {
        message.success(`Сжато ${result.messageCount} сообщений в summary`);
        await refreshAll();
      } else {
        message.warning(
          compactSkipReasonMessage(result.reason, detail?.compaction),
        );
      }
    } catch (error) {
      message.error(error instanceof ApiError ? error.displayMessage() : "Compact failed");
    } finally {
      setCompacting(false);
    }
  };

  const onResetCompaction = async () => {
    if (selectedChatId == null) return;
    Modal.confirm({
      title: "Reset compaction?",
      content: "Summary blocks will be removed; raw messages become active again.",
      onOk: async () => {
        const removed = await resetAgentCompaction(selectedChatId);
        message.success(`Removed ${removed} summaries`);
        await refreshAll();
      },
    });
  };

  const onClearDialog = async () => {
    if (selectedChatId == null) return;
    Modal.confirm({
      title: "Clear dialog?",
      content: "Deletes all messages and summaries for this chat. Facts stay.",
      okType: "danger",
      onOk: async () => {
        await clearAgentDialog(selectedChatId);
        message.success("Dialog cleared");
        await refreshAll();
      },
    });
  };

  const onAddFact = async () => {
    if (selectedChatId == null || !factDraft.trim()) return;
    try {
      const fact = await createAgentFact(selectedChatId, factDraft.trim());
      setFactDraft("");
      setDetail((prev) => (prev ? { ...prev, facts: [...prev.facts, fact] } : prev));
      setChats((prev) =>
        prev.map((c) =>
          c.chatId === selectedChatId ? { ...c, factCount: c.factCount + 1 } : c,
        ),
      );
    } catch (error) {
      message.error(error instanceof ApiError ? error.message : "Failed to add fact");
    }
  };

  const onSaveFact = async () => {
    if (!editingFactId || !editingFactContent.trim()) return;
    try {
      const updated = await updateAgentFact(editingFactId, editingFactContent.trim());
      setEditingFactId(null);
      setEditingFactContent("");
      setDetail((prev) =>
        prev
          ? { ...prev, facts: prev.facts.map((f) => (f.id === updated.id ? updated : f)) }
          : prev,
      );
    } catch (error) {
      message.error(error instanceof ApiError ? error.message : "Failed to update fact");
    }
  };

  const contextCountDelta = (wasExcluded: boolean, excluded: boolean): number => {
    if (wasExcluded === excluded) return 0;
    return excluded ? -1 : 1;
  };

  const onToggleExcluded = async (row: AgentMemoryMessage, excluded: boolean) => {
    const wasExcluded = row.excludedFromContext;
    if (wasExcluded === excluded || togglingMessageId === row.id) return;

    setTogglingMessageId(row.id);
    setHistory((prev) =>
      prev.map((m) => (m.id === row.id ? { ...m, excludedFromContext: excluded } : m)),
    );
    setDetail((prev) => {
      if (!prev) return prev;
      const delta = contextCountDelta(wasExcluded, excluded);
      return {
        ...prev,
        recentContextMessageCount: Math.max(0, prev.recentContextMessageCount + delta),
      };
    });

    try {
      const updated = await updateMessageExcluded(row.id, excluded);
      setHistory((prev) => prev.map((m) => (m.id === row.id ? updated : m)));
    } catch (error) {
      setHistory((prev) =>
        prev.map((m) => (m.id === row.id ? { ...m, excludedFromContext: wasExcluded } : m)),
      );
      setDetail((prev) => {
        if (!prev) return prev;
        const delta = contextCountDelta(excluded, wasExcluded);
        return {
          ...prev,
          recentContextMessageCount: Math.max(0, prev.recentContextMessageCount + delta),
        };
      });
      message.error(error instanceof ApiError ? error.message : "Failed to update message");
    } finally {
      setTogglingMessageId(null);
    }
  };

  const onDeleteMessage = async (messageId: number) => {
    const removed = history.find((m) => m.id === messageId);
    setHistory((prev) => prev.filter((m) => m.id !== messageId));
    if (removed && selectedChatId != null) {
      setChats((prev) =>
        prev.map((c) =>
          c.chatId === selectedChatId ? { ...c, messageCount: Math.max(0, c.messageCount - 1) } : c,
        ),
      );
      if (!removed.excludedFromContext && !removed.compactedIntoSummaryId) {
        setDetail((prev) =>
          prev
            ? {
                ...prev,
                recentContextMessageCount: Math.max(0, prev.recentContextMessageCount - 1),
              }
            : prev,
        );
      }
    }
    try {
      await deleteAgentMessage(messageId);
    } catch (error) {
      await refreshChat();
      message.error(error instanceof ApiError ? error.message : "Failed to delete message");
    }
  };

  const onDeleteFact = async (factId: string) => {
    setDetail((prev) =>
      prev ? { ...prev, facts: prev.facts.filter((f) => f.id !== factId) } : prev,
    );
    if (selectedChatId != null) {
      setChats((prev) =>
        prev.map((c) =>
          c.chatId === selectedChatId ? { ...c, factCount: Math.max(0, c.factCount - 1) } : c,
        ),
      );
    }
    try {
      await deleteAgentFact(factId);
    } catch (error) {
      await refreshChat();
      message.error(error instanceof ApiError ? error.message : "Failed to delete fact");
    }
  };

  const loadMoreHistory = async () => {
    if (selectedChatId == null || nextBeforeId == null) return;
    const page = await fetchAgentMemoryMessages(selectedChatId, nextBeforeId);
    setHistory((prev) => [...prev, ...page.messages]);
    setNextBeforeId(page.nextBeforeId);
  };

  const historyItems = groupHistoryMessages(history);

  return (
    <div className="agent-memory">
      <aside className="agent-memory__sidebar">
        <div className="agent-memory__sidebar-head">
          <Typography.Text className="agent-memory__sidebar-title">Chats</Typography.Text>
          <Tooltip title="Refresh list">
            <Button
              type="text"
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => loadChats()}
              aria-label="Refresh chats"
            />
          </Tooltip>
        </div>
        {apiError ? (
          <Typography.Text type="danger" className="agent-memory__api-error">
            {apiError}
          </Typography.Text>
        ) : null}
        {loading ? (
          <Typography.Text type="secondary" className="agent-memory__sidebar-empty">
            Loading…
          </Typography.Text>
        ) : chats.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No agent chats yet" />
        ) : (
          <ul className="agent-memory__chat-list">
            {chats.map((chat) => (
              <li key={chat.chatId}>
                <button
                  type="button"
                  className={
                    chat.chatId === selectedChatId
                      ? "agent-memory__chat agent-memory__chat--active"
                      : "agent-memory__chat"
                  }
                  onClick={() => setSelectedChatId(chat.chatId)}
                >
                  <span className="agent-memory__chat-id">chat {chat.chatId}</span>
                  <span className="agent-memory__chat-stats">
                    {chat.messageCount} msg · {chat.factCount} facts
                  </span>
                  <span className="agent-memory__chat-time">{formatTime(chat.lastActivityAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <div className="agent-memory__main">
        {!detail ? (
          <Empty description="Select a chat" />
        ) : (
          <>
            <MemorySection
              title="Context"
              meta={`${detail.recentContextMessageCount} messages in LLM context`}
            >
              <div className="agent-memory__toolbar">
                <div className="agent-memory__toolbar-group">
                  <Button
                    size="small"
                    loading={compacting}
                    disabled={
                      !detail.compaction.compactionAvailable
                      || detail.compaction.manualCompactCount <= 0
                    }
                    onClick={onManualCompact}
                  >
                    {detail.compaction.manualCompactCount > 0
                      ? `Сжать ${detail.compaction.manualCompactCount} сообщ.`
                      : "Сжать"}
                  </Button>
                  <Button size="small" onClick={onResetCompaction}>Сбросить сжатие</Button>
                </div>
                <span className="agent-memory__toolbar-divider" aria-hidden />
                <div className="agent-memory__toolbar-group">
                  <Button size="small" danger onClick={onClearDialog}>Очистить диалог</Button>
                </div>
              </div>
              <p className="agent-memory__compact-hint">{compactionHint(detail.compaction)}</p>
            </MemorySection>

            <div className="agent-memory__grid">
              <div className="agent-memory__column agent-memory__column--thread">
                <MemorySection title="History" meta={`${history.length} shown`}>
                  {history.length === 0 ? (
                    <Typography.Text type="secondary">No messages yet.</Typography.Text>
                  ) : (
                    <ul className="agent-memory__thread">
                      {historyItems.map((item) => (
                        <AgentMemoryHistoryItem
                          key={
                            item.kind === "message"
                              ? `m-${item.message.id}`
                              : `tr-${item.assistant.id}`
                          }
                          item={item}
                          formatTime={formatTime}
                          togglingMessageId={togglingMessageId}
                          onToggleExcluded={onToggleExcluded}
                          onDeleteMessage={onDeleteMessage}
                        />
                      ))}
                    </ul>
                  )}
                  {nextBeforeId != null ? (
                    <Button className="agent-memory__load-more" onClick={loadMoreHistory} block>
                      Load older
                    </Button>
                  ) : null}
                </MemorySection>
              </div>

              <div className="agent-memory__column agent-memory__column--side">
                <MemorySection
                  title="Facts"
                  meta={detail.facts.length > 0 ? `${detail.facts.length} stored` : undefined}
                >
                  <div className="agent-memory__fact-add">
                    <Input
                      placeholder="New fact…"
                      value={factDraft}
                      onChange={(e) => setFactDraft(e.target.value)}
                      onPressEnter={onAddFact}
                    />
                    <Button type="primary" onClick={onAddFact} disabled={!factDraft.trim()}>
                      Add
                    </Button>
                  </div>
                  {detail.facts.length === 0 ? (
                    <Typography.Text type="secondary">No facts yet.</Typography.Text>
                  ) : (
                    <ul className="agent-memory__fact-list">
                      {detail.facts.map((fact) => (
                        <li key={fact.id} className="agent-memory__fact">
                          <p className="agent-memory__fact-text">{fact.content}</p>
                          <div className="agent-memory__fact-actions">
                            <Tooltip title="Edit">
                              <Button
                                type="text"
                                size="small"
                                icon={<EditOutlined />}
                                aria-label="Edit fact"
                                onClick={() => {
                                  setEditingFactId(fact.id);
                                  setEditingFactContent(fact.content);
                                }}
                              />
                            </Tooltip>
                            <Tooltip title="Delete">
                              <Button
                                type="text"
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                aria-label="Delete fact"
                                onClick={() => onDeleteFact(fact.id)}
                              />
                            </Tooltip>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </MemorySection>

                <MemorySection
                  title="Summaries"
                  meta={detail.summaries.length > 0 ? `${detail.summaries.length} blocks` : undefined}
                  className="agent-memory__section--summaries"
                >
                  {detail.summaries.length === 0 ? (
                    <Typography.Text type="secondary">No compaction blocks yet.</Typography.Text>
                  ) : (
                    <ul className="agent-memory__summary-list">
                      {detail.summaries.map((summary) => (
                        <li key={summary.id} className="agent-memory__summary">
                          <div className="agent-memory__summary-head">
                            <Tag color="purple">#{summary.sequence}</Tag>
                            <span className="agent-memory__summary-meta">
                              ids {summary.coversMessageIdFrom}–{summary.coversMessageIdTo} ({summary.sourceMessageCount})
                            </span>
                          </div>
                          <p className="agent-memory__summary-text">{summary.summaryText}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </MemorySection>
              </div>
            </div>
          </>
        )}
      </div>

      <Modal
        title="Edit fact"
        open={editingFactId != null}
        onOk={onSaveFact}
        onCancel={() => {
          setEditingFactId(null);
          setEditingFactContent("");
        }}
      >
        <Input.TextArea rows={4} value={editingFactContent} onChange={(e) => setEditingFactContent(e.target.value)} />
      </Modal>
    </div>
  );
}
