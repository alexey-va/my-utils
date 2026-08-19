import {
  ClearOutlined,
  DeleteOutlined,
  EditOutlined,
  PictureOutlined,
  PlusOutlined,
  ReloadOutlined,
  SendOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Empty,
  Input,
  Modal,
  Spin,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { AgentMemoryMessage } from "../../api/agentMemory";
import {
  clearAgentTestChat,
  createAgentTestChat,
  deleteAgentTestChat,
  fetchAgentTestChatMessages,
  fetchAgentTestChats,
  renameAgentTestChat,
  sendAgentTestChatMessage,
  type AgentTestChat,
} from "../../api/agentTestChats";
import { ApiError } from "../../api/errors";
import AgentMemoryHistoryItem from "./AgentMemoryHistoryItem";
import AgentMemoryImageStrip from "./AgentMemoryImageStrip";
import { groupHistoryMessages } from "./agentMemoryFormat";
import {
  filesToPendingImages,
  pendingImageDataUrls,
  type PendingAgentImage,
} from "./agentMemoryImages";

function formatTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function chronological(messages: AgentMemoryMessage[]): AgentMemoryMessage[] {
  return [...messages].reverse();
}

export default function AgentTestConsolePage() {
  const [chats, setChats] = useState<AgentTestChat[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<AgentMemoryMessage[]>([]);
  const [nextBeforeId, setNextBeforeId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [pendingImages, setPendingImages] = useState<PendingAgentImage[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState("");
  const [renaming, setRenaming] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const selectedChat = chats.find((chat) => chat.id === selectedId) ?? null;

  const loadChats = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchAgentTestChats();
      setChats(rows);
      setSelectedId((current) => {
        if (current && rows.some((chat) => chat.id === current)) {
          return current;
        }
        return rows[0]?.id ?? null;
      });
    } catch (error) {
      message.error(error instanceof ApiError ? error.displayMessage() : "Не удалось загрузить тестовые чаты");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async (chatId: string) => {
    setLoadingHistory(true);
    try {
      const page = await fetchAgentTestChatMessages(chatId);
      setHistory(chronological(page.messages));
      setNextBeforeId(page.nextBeforeId);
    } catch (error) {
      message.error(error instanceof ApiError ? error.displayMessage() : "Не удалось загрузить историю");
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    void loadChats();
  }, [loadChats]);

  useEffect(() => {
    setHistory([]);
    setNextBeforeId(null);
    if (selectedId) {
      void loadHistory(selectedId);
    }
  }, [selectedId, loadHistory]);

  useLayoutEffect(() => {
    const element = chatScrollRef.current;
    if (element && !loadingOlder) {
      element.scrollTop = element.scrollHeight;
    }
  }, [history, loadingOlder]);

  const onCreate = async () => {
    const title = createTitle.trim();
    if (!title || creating) return;
    setCreating(true);
    try {
      const created = await createAgentTestChat(title);
      setChats((current) => [created, ...current]);
      setSelectedId(created.id);
      setCreateTitle("");
      setCreateOpen(false);
      message.success("Тестовый чат создан");
    } catch (error) {
      message.error(error instanceof ApiError ? error.displayMessage() : "Не удалось создать чат");
    } finally {
      setCreating(false);
    }
  };

  const onRename = async () => {
    if (!selectedChat || !renameTitle.trim() || renaming) return;
    setRenaming(true);
    try {
      const updated = await renameAgentTestChat(selectedChat.id, renameTitle.trim());
      setChats((current) => current.map((chat) => (chat.id === updated.id ? updated : chat)));
      setRenameOpen(false);
      setRenameTitle("");
    } catch (error) {
      message.error(error instanceof ApiError ? error.displayMessage() : "Не удалось переименовать чат");
    } finally {
      setRenaming(false);
    }
  };

  const onClear = () => {
    if (!selectedChat) return;
    Modal.confirm({
      title: "Начать чистый чат?",
      content: "Удалятся сообщения, tool rounds и все данные sandbox этого тестового чата.",
      okText: "Очистить",
      okType: "danger",
      cancelText: "Отмена",
      onOk: async () => {
        await clearAgentTestChat(selectedChat.id);
        setHistory([]);
        setNextBeforeId(null);
        setChats((current) =>
          current.map((chat) =>
            chat.id === selectedChat.id ? { ...chat, messageCount: 0 } : chat,
          ),
        );
      },
    });
  };

  const onDelete = () => {
    if (!selectedChat) return;
    Modal.confirm({
      title: `Удалить «${selectedChat.title}»?`,
      content: "Удалятся только тестовая история и её sandbox. Реальные Workout-данные не затрагиваются.",
      okText: "Удалить",
      okType: "danger",
      cancelText: "Отмена",
      onOk: async () => {
        await deleteAgentTestChat(selectedChat.id);
        const remaining = chats.filter((chat) => chat.id !== selectedChat.id);
        setChats(remaining);
        setSelectedId(remaining[0]?.id ?? null);
        setHistory([]);
      },
    });
  };

  const onLoadOlder = async () => {
    if (!selectedChat || nextBeforeId == null || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const page = await fetchAgentTestChatMessages(selectedChat.id, nextBeforeId);
      setHistory((current) => [...chronological(page.messages), ...current]);
      setNextBeforeId(page.nextBeforeId);
    } finally {
      setLoadingOlder(false);
    }
  };

  const onSend = async () => {
    if (!selectedChat || sending) return;
    const content = draft.trim();
    const images = pendingImageDataUrls(pendingImages);
    if (!content && images.length === 0) return;
    setSending(true);
    try {
      const result = await sendAgentTestChatMessage(selectedChat.id, content, images);
      setDraft("");
      setPendingImages([]);
      setHistory((current) => [...current, ...result.messages]);
      const updatedAt = result.messages.at(-1)?.createdAt ?? new Date().toISOString();
      setChats((current) =>
        current
          .map((chat) =>
            chat.id === selectedChat.id
              ? {
                  ...chat,
                  messageCount: chat.messageCount + result.messages.length,
                  updatedAt,
                }
              : chat,
          )
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      );
    } catch (error) {
      message.error(error instanceof ApiError ? error.displayMessage() : "Agent turn завершился с ошибкой");
      await loadHistory(selectedChat.id);
    } finally {
      setSending(false);
    }
  };

  const onAttachImages = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      const next = await filesToPendingImages(files);
      setPendingImages((current) => [...current, ...next].slice(0, 4));
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Не удалось прочитать изображение");
    } finally {
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const canSend = draft.trim().length > 0 || pendingImages.length > 0;
  const historyItems = groupHistoryMessages(history.filter((row) => row.role !== "system"));

  return (
    <div className="agent-test-console">
      <Alert
        className="agent-test-console__sandbox-alert"
        type="success"
        showIcon
        message={<><strong>SANDBOX</strong> — отдельные чистые данные для каждого чата. Telegram и реальные Workout-данные не затрагиваются.</>}
      />

      <div className="agent-test-console__layout">
        <aside className="agent-test-console__sidebar">
          <div className="agent-test-console__sidebar-head">
            <Typography.Text className="agent-memory__sidebar-title">Тестовые чаты</Typography.Text>
            <div className="agent-test-console__sidebar-actions">
              <Tooltip title="Обновить">
                <Button
                  type="text"
                  size="small"
                  icon={<ReloadOutlined />}
                  loading={loading}
                  aria-label="Обновить список"
                  onClick={() => void loadChats()}
                />
              </Tooltip>
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                aria-label="Новый чат"
                onClick={() => setCreateOpen(true)}
              >
                Новый чат
              </Button>
            </div>
          </div>

          {loading && chats.length === 0 ? (
            <div className="agent-test-console__loading"><Spin size="small" /></div>
          ) : chats.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Пока нет тестовых чатов" />
          ) : (
            <ul className="agent-test-console__chat-list">
              {chats.map((chat) => (
                <li key={chat.id}>
                  <button
                    type="button"
                    className={
                      chat.id === selectedId
                        ? "agent-test-console__chat agent-test-console__chat--active"
                        : "agent-test-console__chat"
                    }
                    onClick={() => setSelectedId(chat.id)}
                  >
                    <span className="agent-test-console__chat-title">{chat.title}</span>
                    <span className="agent-test-console__chat-meta">
                      {chat.messageCount} сообщений · {formatTime(chat.updatedAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="agent-test-console__chat-shell">
          {!selectedChat ? (
            <Empty description="Создай тестовый чат, чтобы начать диалог" />
          ) : (
            <>
              <header className="agent-test-console__chat-head">
                <div>
                  <h3>{selectedChat.title}</h3>
                  <span>Отдельная история и данные · без Telegram и production-записей</span>
                </div>
                <div className="agent-test-console__chat-actions">
                  <Tooltip title="Переименовать">
                    <Button
                      type="text"
                      icon={<EditOutlined />}
                      aria-label="Переименовать чат"
                      onClick={() => {
                        setRenameTitle(selectedChat.title);
                        setRenameOpen(true);
                      }}
                    />
                  </Tooltip>
                  <Tooltip title="Очистить историю">
                    <Button
                      type="text"
                      icon={<ClearOutlined />}
                      aria-label="Очистить историю"
                      onClick={onClear}
                    />
                  </Tooltip>
                  <Tooltip title="Удалить чат">
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      aria-label="Удалить чат"
                      onClick={onDelete}
                    />
                  </Tooltip>
                </div>
              </header>

              <div className="agent-test-console__history" ref={chatScrollRef}>
                {nextBeforeId != null ? (
                  <Button block loading={loadingOlder} onClick={() => void onLoadOlder()}>
                    Загрузить старые сообщения
                  </Button>
                ) : null}
                {loadingHistory ? (
                  <div className="agent-test-console__loading"><Spin /></div>
                ) : historyItems.length === 0 ? (
                  <div className="agent-test-console__empty-history">
                    <Typography.Text type="secondary">
                      Напиши сообщение. Ответ, tool calls и их результаты сохранятся здесь.
                    </Typography.Text>
                  </div>
                ) : (
                  <ul className="agent-memory__thread">
                    {historyItems.map((item) => (
                      <AgentMemoryHistoryItem
                        key={item.kind === "message" ? `m-${item.message.id}` : `tr-${item.assistant.id}`}
                        item={item}
                        formatTime={formatTime}
                        togglingMessageId={null}
                        onToggleExcluded={() => undefined}
                        onDeleteMessage={() => undefined}
                        showActions={false}
                      />
                    ))}
                  </ul>
                )}
              </div>

              <div className="agent-test-console__composer">
                <input
                  ref={imageInputRef}
                  className="agent-memory__image-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  onChange={(event) => void onAttachImages(event.target.files)}
                />
                {pendingImages.length > 0 ? (
                  <div className="agent-memory__compose-images">
                    <AgentMemoryImageStrip images={pendingImages.map((image) => image.dataUrl)} />
                    <div className="agent-memory__compose-images-actions">
                      {pendingImages.map((image) => (
                        <Button
                          key={image.id}
                          size="small"
                          type="text"
                          danger
                          onClick={() =>
                            setPendingImages((current) => current.filter((item) => item.id !== image.id))
                          }
                        >
                          Убрать {image.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <Input.TextArea
                  value={draft}
                  placeholder="Сообщение Workout-ассистенту…"
                  autoSize={{ minRows: 2, maxRows: 7 }}
                  disabled={sending}
                  onChange={(event) => setDraft(event.target.value)}
                  onPressEnter={(event) => {
                    if (!event.shiftKey) {
                      event.preventDefault();
                      void onSend();
                    }
                  }}
                />
                <div className="agent-test-console__composer-actions">
                  <Button
                    icon={<PictureOutlined />}
                    disabled={sending || pendingImages.length >= 4}
                    onClick={() => imageInputRef.current?.click()}
                  >
                    Изображение
                  </Button>
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    aria-label="Отправить"
                    loading={sending}
                    disabled={!canSend}
                    onClick={() => void onSend()}
                  >
                    Отправить
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <Modal
        title="Новый тестовый чат"
        open={createOpen}
        okText="Создать"
        cancelText="Отмена"
        confirmLoading={creating}
        okButtonProps={{ disabled: !createTitle.trim() }}
        onOk={() => void onCreate()}
        onCancel={() => {
          setCreateOpen(false);
          setCreateTitle("");
        }}
      >
        <Input
          autoFocus
          maxLength={120}
          placeholder="Например: Проверка календаря"
          value={createTitle}
          onChange={(event) => setCreateTitle(event.target.value)}
          onPressEnter={() => void onCreate()}
        />
      </Modal>

      <Modal
        title="Переименовать чат"
        open={renameOpen}
        okText="Сохранить"
        cancelText="Отмена"
        confirmLoading={renaming}
        okButtonProps={{ disabled: !renameTitle.trim() }}
        onOk={() => void onRename()}
        onCancel={() => setRenameOpen(false)}
      >
        <Input
          maxLength={120}
          value={renameTitle}
          onChange={(event) => setRenameTitle(event.target.value)}
          onPressEnter={() => void onRename()}
        />
      </Modal>
    </div>
  );
}
