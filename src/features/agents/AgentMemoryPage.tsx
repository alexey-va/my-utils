import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Button,
  Collapse,
  Empty,
  Input,
  InputNumber,
  Modal,
  Select,
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
  appendAgentMessage,
  simulateAgentChat,
  compactAgentMemory,
  clearAgentDialog,
  createAgentFact,
  deleteAgentFact,
  deleteAgentMessage,
  deleteAgentSummary,
  fetchAgentMemoryChat,
  fetchAgentMemoryChats,
  fetchAgentMemoryMessages,
  updateAgentFact,
  updateMessageExcluded,
  type AgentMemoryChatDetail,
  type AgentMemoryChatSummary,
  type AgentMemoryMessage,
} from "../../api/agentMemory";
import { ApiError } from "../../api/errors";
import AgentMemoryHistoryItem from "./AgentMemoryHistoryItem";
import AgentMemorySystemItem from "./AgentMemorySystemItem";
import { compactSkipReasonMessage, compactableAfterKeep, compactionHint } from "./agentMemoryCompaction";
import { groupHistoryMessages } from "./agentMemoryFormat";

function formatFactDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function confidenceLevel(value: number): "high" | "mid" | "low" {
  if (value >= 0.8) return "high";
  if (value >= 0.5) return "mid";
  return "low";
}

function formatConfidenceLabel(value: number): string {
  return `${Math.round(value * 100)}%`;
}

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
  const [factConfidence, setFactConfidence] = useState(1);
  const [editingFactId, setEditingFactId] = useState<string | null>(null);
  const [editingFactContent, setEditingFactContent] = useState("");
  const [editingFactConfidence, setEditingFactConfidence] = useState(1);

  const [apiError, setApiError] = useState<string | null>(null);
  const [togglingMessageId, setTogglingMessageId] = useState<number | null>(null);
  const [compacting, setCompacting] = useState(false);
  const [compactKeepRecent, setCompactKeepRecent] = useState(0);
  const [deletingSummaryId, setDeletingSummaryId] = useState<string | null>(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [messageRole, setMessageRole] = useState<"user" | "assistant">("user");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [chatting, setChatting] = useState(false);

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

  const onCompact = async () => {
    if (selectedChatId == null) return;
    setCompacting(true);
    try {
      const keepRecent = Math.max(0, compactKeepRecent);
      const result = await compactAgentMemory(selectedChatId, keepRecent);
      if (result.compacted) {
        message.success(`Сжато ${result.messageCount} сообщений в summary`);
        await refreshAll();
      } else {
        message.warning(compactSkipReasonMessage(result.reason));
      }
    } catch (error) {
      message.error(error instanceof ApiError ? error.displayMessage() : "Compact failed");
    } finally {
      setCompacting(false);
    }
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
      const fact = await createAgentFact(selectedChatId, factDraft.trim(), factConfidence);
      setFactDraft("");
      setFactConfidence(1);
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
      const updated = await updateAgentFact(editingFactId, editingFactContent.trim(), editingFactConfidence);
      setEditingFactId(null);
      setEditingFactContent("");
      setEditingFactConfidence(1);
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
      if (!removed.excludedFromContext && !removed.isCompacted) {
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

  const applyNewMessages = (newMessages: AgentMemoryMessage[]) => {
    if (newMessages.length === 0 || selectedChatId == null) return;
    const ordered = [...newMessages].reverse();
    setHistory((prev) => [...ordered, ...prev]);
    const contextDelta = newMessages.filter((m) => !m.isCompacted && !m.excludedFromContext).length;
    setDetail((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        recentContextMessageCount: prev.recentContextMessageCount + contextDelta,
        compaction: {
          ...prev.compaction,
          compactableCount: prev.compaction.compactableCount + contextDelta,
        },
      };
    });
    const last = newMessages[newMessages.length - 1];
    setChats((prev) =>
      prev.map((c) =>
        c.chatId === selectedChatId
          ? {
              ...c,
              messageCount: c.messageCount + newMessages.length,
              lastActivityAt: last.createdAt,
            }
          : c,
      ),
    );
  };

  const onManualAppend = async () => {
    if (selectedChatId == null || !messageDraft.trim() || sendingMessage || chatting) return;
    setSendingMessage(true);
    const text = messageDraft.trim();
    try {
      const created = await appendAgentMessage(selectedChatId, messageRole, text);
      setMessageDraft("");
      applyNewMessages([created]);
    } catch (error) {
      message.error(error instanceof ApiError ? error.message : "Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  const onChatWithAgent = async () => {
    if (selectedChatId == null || !messageDraft.trim() || chatting || sendingMessage) return;
    setChatting(true);
    const text = messageDraft.trim();
    try {
      const result = await simulateAgentChat(selectedChatId, text);
      setMessageDraft("");
      applyNewMessages(result.messages);
      fetchAgentMemoryChat(selectedChatId)
        .then((chatDetail) => setDetail(chatDetail))
        .catch(() => undefined);
    } catch (error) {
      message.error(error instanceof ApiError ? error.displayMessage() : "Agent chat failed");
    } finally {
      setChatting(false);
    }
  };

  const onDeleteSummary = async (summaryId: string) => {
    if (deletingSummaryId != null) return;
    setDeletingSummaryId(summaryId);
    const previousDetail = detail;
    const previousChats = chats;
    setDetail((prev) =>
      prev ? { ...prev, summaries: prev.summaries.filter((s) => s.id !== summaryId) } : prev,
    );
    if (selectedChatId != null) {
      setChats((prev) =>
        prev.map((c) =>
          c.chatId === selectedChatId
            ? { ...c, summaryCount: Math.max(0, c.summaryCount - 1) }
            : c,
        ),
      );
    }
    try {
      await deleteAgentSummary(summaryId);
    } catch (error) {
      setDetail(previousDetail);
      setChats(previousChats);
      message.error(error instanceof ApiError ? error.message : "Failed to delete summary");
    } finally {
      setDeletingSummaryId(null);
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

  const systemMessages = history.filter((row) => row.role === "system");
  const dialogHistory = history.filter((row) => row.role !== "system");
  const historyItems = groupHistoryMessages(dialogHistory);
  const compactableCount = detail?.compaction.compactableCount ?? 0;
  const compactableNow = compactableAfterKeep(compactableCount, compactKeepRecent);

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
                    type="primary"
                    loading={compacting}
                    disabled={
                      !detail.compaction.compactionAvailable
                      || compactableNow <= 0
                    }
                    onClick={onCompact}
                  >
                    Сжать
                  </Button>
                  <Tooltip title="0 = сжать всё; N = оставить N последних сырых сообщений">
                    <InputNumber
                      className="agent-memory__compact-keep"
                      size="small"
                      min={0}
                      max={compactableCount}
                      value={compactKeepRecent}
                      onChange={(value) =>
                        setCompactKeepRecent(typeof value === "number" ? value : 0)
                      }
                    />
                  </Tooltip>
                  <span className="agent-memory__compact-keep-label">оставить</span>
                </div>
                <span className="agent-memory__toolbar-divider" aria-hidden />
                <div className="agent-memory__toolbar-group">
                  <Button size="small" danger onClick={onClearDialog}>Очистить диалог</Button>
                </div>
              </div>
              <p className="agent-memory__compact-hint">
                {compactionHint(
                  compactableCount,
                  compactKeepRecent,
                  detail.compaction.compactionAvailable,
                )}
              </p>
            </MemorySection>

            <div className="agent-memory__grid">
              <div className="agent-memory__column agent-memory__column--thread">
                {systemMessages.length > 0 ? (
                  <Collapse
                    className="agent-memory__system-collapse"
                    defaultActiveKey={[]}
                    items={[
                      {
                        key: "system",
                        label: `System (${systemMessages.length})`,
                        children: (
                          <ul className="agent-memory__system-list">
                            {systemMessages.map((row) => (
                              <AgentMemorySystemItem
                                key={row.id}
                                row={row}
                                formatTime={formatTime}
                                togglingMessageId={togglingMessageId}
                                onToggleExcluded={onToggleExcluded}
                                onDeleteMessage={onDeleteMessage}
                              />
                            ))}
                          </ul>
                        ),
                      },
                    ]}
                  />
                ) : null}
                <MemorySection title="History" meta={`${dialogHistory.length} shown`}>
                  {dialogHistory.length === 0 ? (
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
                  <div className="agent-memory__message-compose">
                    <Input.TextArea
                      className="agent-memory__message-compose-input"
                      placeholder="Написать в чат с агентом (без Telegram)…"
                      value={messageDraft}
                      autoSize={{ minRows: 2, maxRows: 6 }}
                      disabled={chatting || sendingMessage}
                      onChange={(e) => setMessageDraft(e.target.value)}
                      onPressEnter={(e) => {
                        if (!e.shiftKey) {
                          e.preventDefault();
                          onChatWithAgent();
                        }
                      }}
                    />
                    <div className="agent-memory__message-compose-actions">
                      <Button
                        type="primary"
                        size="small"
                        loading={chatting}
                        disabled={
                          !messageDraft.trim()
                          || sendingMessage
                          || !detail.compaction.compactionAvailable
                        }
                        onClick={onChatWithAgent}
                      >
                        Отправить
                      </Button>
                      <Select
                        className="agent-memory__message-compose-role"
                        size="small"
                        value={messageRole}
                        disabled={chatting || sendingMessage}
                        onChange={(value) => setMessageRole(value)}
                        options={[
                          { value: "user", label: "User" },
                          { value: "assistant", label: "Assistant" },
                        ]}
                      />
                      <Button
                        size="small"
                        loading={sendingMessage}
                        disabled={!messageDraft.trim() || chatting}
                        onClick={onManualAppend}
                      >
                        Добавить вручную
                      </Button>
                    </div>
                  </div>
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
                    <Tooltip title="Уверенность 0–1 (1 = точно, 0.6 = гипотеза)">
                      <InputNumber
                        className="agent-memory__fact-confidence-input"
                        min={0}
                        max={1}
                        step={0.05}
                        value={factConfidence}
                        onChange={(value) => setFactConfidence(typeof value === "number" ? value : 1)}
                      />
                    </Tooltip>
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
                          <div className="agent-memory__fact-body">
                            <p className="agent-memory__fact-text">{fact.content}</p>
                            <div className="agent-memory__fact-meta">
                              <time className="agent-memory__fact-date">
                                {formatFactDate(fact.createdAt)}
                              </time>
                              <Tag
                                className={`agent-memory__fact-confidence agent-memory__fact-confidence--${confidenceLevel(fact.confidence ?? 1)}`}
                              >
                                {formatConfidenceLabel(fact.confidence ?? 1)}
                              </Tag>
                            </div>
                          </div>
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
                                  setEditingFactConfidence(fact.confidence);
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
                            <div className="agent-memory__summary-title">
                              <Tag color="purple">#{summary.sequence}</Tag>
                              <span className="agent-memory__summary-meta">
                                ids {summary.coversMessageIdFrom}–{summary.coversMessageIdTo} ({summary.sourceMessageCount})
                              </span>
                            </div>
                            <div className="agent-memory__summary-actions">
                              <Tooltip title="Удалить текст summary из контекста; сообщения остаются сжатыми">
                                <Button
                                  type="text"
                                  size="small"
                                  danger
                                  icon={<DeleteOutlined />}
                                  aria-label="Delete summary"
                                  loading={deletingSummaryId === summary.id}
                                  disabled={deletingSummaryId != null}
                                  onClick={() => onDeleteSummary(summary.id)}
                                />
                              </Tooltip>
                            </div>
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
          setEditingFactConfidence(1);
        }}
      >
        <Input.TextArea rows={4} value={editingFactContent} onChange={(e) => setEditingFactContent(e.target.value)} />
        <div className="agent-memory__fact-edit-confidence">
          <Typography.Text type="secondary">Уверенность (0–1)</Typography.Text>
          <InputNumber
            min={0}
            max={1}
            step={0.05}
            value={editingFactConfidence}
            onChange={(value) => setEditingFactConfidence(typeof value === "number" ? value : 1)}
          />
        </div>
      </Modal>
    </div>
  );
}
