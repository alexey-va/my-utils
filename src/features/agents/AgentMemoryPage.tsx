import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Empty,
  Input,
  List,
  Modal,
  Space,
  Switch,
  Tag,
  Typography,
  message,
} from "antd";
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
import AppPanel from "../../shared/components/AppPanel";

function formatTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function roleColor(role: string): string {
  switch (role) {
    case "user":
      return "blue";
    case "assistant":
      return "green";
    case "tool":
      return "orange";
    default:
      return "default";
  }
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

  const loadChats = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchAgentMemoryChats();
      setChats(rows);
      if (rows.length > 0 && selectedChatId == null) {
        setSelectedChatId(rows[0].chatId);
      }
    } catch (error) {
      message.error(error instanceof ApiError ? error.message : "Failed to load chats");
    } finally {
      setLoading(false);
    }
  }, [selectedChatId]);

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

  const refresh = async () => {
    await loadChats();
    if (selectedChatId != null) {
      await loadChat(selectedChatId);
    }
  };

  const onCompact = async (force = false) => {
    if (selectedChatId == null) return;
    try {
      const result = await compactAgentMemory(selectedChatId, force);
      message.success(
        result.compacted
          ? `Compacted ${result.messageCount} messages`
          : "Nothing to compact",
      );
      await refresh();
    } catch (error) {
      message.error(error instanceof ApiError ? error.message : "Compact failed");
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
        await refresh();
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
        await refresh();
      },
    });
  };

  const onAddFact = async () => {
    if (selectedChatId == null || !factDraft.trim()) return;
    try {
      await createAgentFact(selectedChatId, factDraft.trim());
      setFactDraft("");
      await refresh();
    } catch (error) {
      message.error(error instanceof ApiError ? error.message : "Failed to add fact");
    }
  };

  const onSaveFact = async () => {
    if (!editingFactId || !editingFactContent.trim()) return;
    try {
      await updateAgentFact(editingFactId, editingFactContent.trim());
      setEditingFactId(null);
      setEditingFactContent("");
      await refresh();
    } catch (error) {
      message.error(error instanceof ApiError ? error.message : "Failed to update fact");
    }
  };

  const onToggleExcluded = async (row: AgentMemoryMessage, excluded: boolean) => {
    try {
      await updateMessageExcluded(row.id, excluded);
      await refresh();
    } catch (error) {
      message.error(error instanceof ApiError ? error.message : "Failed to update message");
    }
  };

  const loadMoreHistory = async () => {
    if (selectedChatId == null || nextBeforeId == null) return;
    const page = await fetchAgentMemoryMessages(selectedChatId, nextBeforeId);
    setHistory((prev) => [...prev, ...page.messages]);
    setNextBeforeId(page.nextBeforeId);
  };

  return (
    <div className="agent-memory">
      <aside className="agent-memory__sidebar">
        <Typography.Text className="agent-memory__sidebar-title">Chats</Typography.Text>
        <List
          loading={loading}
          dataSource={chats}
          locale={{ emptyText: <Empty description="No agent chats yet" /> }}
          renderItem={(chat) => (
            <List.Item
              className={
                chat.chatId === selectedChatId ? "agent-memory__chat agent-memory__chat--active" : "agent-memory__chat"
              }
              onClick={() => setSelectedChatId(chat.chatId)}
            >
              <div>
                <Typography.Text strong>chatId {chat.chatId}</Typography.Text>
                <div className="agent-memory__chat-meta">
                  <Tag>{chat.messageCount} msg</Tag>
                  <Tag>{chat.factCount} facts</Tag>
                  <Tag>{chat.summaryCount} sum</Tag>
                </div>
                <Typography.Text type="secondary" className="agent-memory__chat-time">
                  {formatTime(chat.lastActivityAt)}
                </Typography.Text>
              </div>
            </List.Item>
          )}
        />
      </aside>

      <div className="agent-memory__main">
        {!detail ? (
          <Empty description="Select a chat" />
        ) : (
          <>
            <AppPanel className="agent-memory__panel">
              <div className="agent-memory__panel-head">
                <Typography.Title level={5}>Context controls</Typography.Title>
                <Space wrap>
                  <Button onClick={() => onCompact(false)}>Compact</Button>
                  <Button onClick={() => onCompact(true)}>Force compact</Button>
                  <Button onClick={onResetCompaction}>Reset compaction</Button>
                  <Button danger onClick={onClearDialog}>Clear dialog</Button>
                </Space>
              </div>
              <Typography.Paragraph type="secondary">
                Recent context messages in LLM: {detail.recentContextMessageCount}
              </Typography.Paragraph>
            </AppPanel>

            <AppPanel className="agent-memory__panel">
              <Typography.Title level={5}>Summaries</Typography.Title>
              {detail.summaries.length === 0 ? (
                <Typography.Text type="secondary">No compaction blocks yet.</Typography.Text>
              ) : (
                detail.summaries.map((summary) => (
                  <div key={summary.id} className="agent-memory__summary">
                    <Tag color="purple">COMPACTED #{summary.sequence}</Tag>
                    <Typography.Paragraph className="agent-memory__summary-text">
                      {summary.summaryText}
                    </Typography.Paragraph>
                    <Typography.Text type="secondary">
                      messages {summary.coversMessageIdFrom}–{summary.coversMessageIdTo} (
                      {summary.sourceMessageCount})
                    </Typography.Text>
                  </div>
                ))
              )}
            </AppPanel>

            <AppPanel className="agent-memory__panel">
              <Typography.Title level={5}>Facts</Typography.Title>
              <Space.Compact style={{ width: "100%", marginBottom: 12 }}>
                <Input
                  placeholder="New fact…"
                  value={factDraft}
                  onChange={(e) => setFactDraft(e.target.value)}
                  onPressEnter={onAddFact}
                />
                <Button type="primary" onClick={onAddFact}>Add</Button>
              </Space.Compact>
              <List
                dataSource={detail.facts}
                locale={{ emptyText: "No facts" }}
                renderItem={(fact) => (
                  <List.Item
                    actions={[
                      <Button
                        key="edit"
                        size="small"
                        onClick={() => {
                          setEditingFactId(fact.id);
                          setEditingFactContent(fact.content);
                        }}
                      >
                        Edit
                      </Button>,
                      <Button
                        key="del"
                        size="small"
                        danger
                        onClick={async () => {
                          await deleteAgentFact(fact.id);
                          await refresh();
                        }}
                      >
                        Delete
                      </Button>,
                    ]}
                  >
                    <Typography.Text code>{fact.id.slice(0, 8)}…</Typography.Text>
                    <Typography.Paragraph>{fact.content}</Typography.Paragraph>
                  </List.Item>
                )}
              />
            </AppPanel>

            <AppPanel className="agent-memory__panel">
              <Typography.Title level={5}>Full history</Typography.Title>
              <List
                dataSource={history}
                renderItem={(row) => (
                  <List.Item
                    className={row.excludedFromContext ? "agent-memory__message--excluded" : undefined}
                    actions={[
                      <Switch
                        key="ex"
                        checked={row.excludedFromContext}
                        onChange={(checked) => onToggleExcluded(row, checked)}
                        checkedChildren="skip"
                        unCheckedChildren="in ctx"
                      />,
                      <Button
                        key="del"
                        size="small"
                        danger
                        onClick={async () => {
                          await deleteAgentMessage(row.id);
                          await refresh();
                        }}
                      >
                        Del
                      </Button>,
                    ]}
                  >
                    <Space direction="vertical" size={0}>
                      <Space>
                        <Tag color={roleColor(row.role)}>{row.role}</Tag>
                        {row.compactedIntoSummaryId ? <Tag color="purple">compacted</Tag> : null}
                        <Typography.Text type="secondary">{formatTime(row.createdAt)}</Typography.Text>
                      </Space>
                      <Typography.Text>{row.content ?? row.rawJson}</Typography.Text>
                    </Space>
                  </List.Item>
                )}
              />
              {nextBeforeId != null ? (
                <Button onClick={loadMoreHistory} block>Load older</Button>
              ) : null}
            </AppPanel>
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
