import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentMemoryMessage } from "../../api/agentMemory";
import type { AgentTestChat } from "../../api/agentTestChats";
import AgentTestConsolePage from "./AgentTestConsolePage";

const api = vi.hoisted(() => ({
  fetchChats: vi.fn(),
  fetchChat: vi.fn(),
  createChat: vi.fn(),
  renameChat: vi.fn(),
  deleteChat: vi.fn(),
  fetchMessages: vi.fn(),
  sendMessage: vi.fn(),
  clearChat: vi.fn(),
}));

vi.mock("../../api/agentTestChats", () => ({
  fetchAgentTestChats: api.fetchChats,
  fetchAgentTestChat: api.fetchChat,
  createAgentTestChat: api.createChat,
  renameAgentTestChat: api.renameChat,
  deleteAgentTestChat: api.deleteChat,
  fetchAgentTestChatMessages: api.fetchMessages,
  sendAgentTestChatMessage: api.sendMessage,
  clearAgentTestChat: api.clearChat,
}));

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  api.fetchChats.mockResolvedValue([testChat]);
  api.fetchChat.mockResolvedValue(testChat);
  api.fetchMessages.mockResolvedValue({ messages: [], nextBeforeId: null });
  api.createChat.mockResolvedValue(testChat);
  api.renameChat.mockResolvedValue(testChat);
  api.deleteChat.mockResolvedValue(undefined);
  api.clearChat.mockResolvedValue(undefined);
  api.sendMessage.mockResolvedValue({
    reply: "Упражнения загружены.",
    messages: toolRound,
  });
});

describe("AgentTestConsolePage", () => {
  it("keeps the chat menu visible while refreshing it", async () => {
    render(<AgentTestConsolePage />);

    expect(await screen.findByRole("button", { name: /Тестовый чат/ })).toBeInTheDocument();
    api.fetchChats.mockImplementationOnce(() => new Promise(() => undefined));
    fireEvent.click(screen.getByRole("button", { name: "Обновить список" }));

    expect(screen.getByRole("button", { name: /Тестовый чат/ })).toBeInTheDocument();
  });

  it("shows isolated sandbox and renders persisted tool calls after a real turn", async () => {
    render(<AgentTestConsolePage />);

    expect(await screen.findByText("SANDBOX")).toBeInTheDocument();
    expect(screen.queryByText("LIVE DATA")).not.toBeInTheDocument();
    const composer = await screen.findByPlaceholderText("Сообщение Workout-ассистенту…");
    fireEvent.change(composer, { target: { value: "Покажи упражнения" } });
    fireEvent.click(screen.getByRole("button", { name: "Отправить" }));

    await waitFor(() => {
      expect(api.sendMessage).toHaveBeenCalledWith(
        testChat.id,
        "Покажи упражнения",
        [],
      );
    });
    expect(await screen.findByText("listExercises")).toBeInTheDocument();
    expect(screen.getByText("Сначала прочитаю список упражнений.")).toBeInTheDocument();
    expect(screen.getByText("Упражнения загружены.")).toBeInTheDocument();
  });

  it("creates the first named test chat from the empty state", async () => {
    api.fetchChats.mockResolvedValueOnce([]);
    render(<AgentTestConsolePage />);

    fireEvent.click(await screen.findByRole("button", { name: "Новый чат" }));
    fireEvent.change(screen.getByPlaceholderText("Например: Проверка календаря"), {
      target: { value: "Проверка календаря" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Создать" }));

    await waitFor(() => {
      expect(api.createChat).toHaveBeenCalledWith("Проверка календаря");
    });
    expect(await screen.findByRole("heading", { name: "Тестовый чат" })).toBeInTheDocument();
  });

  it("ignores a stale history response after switching chats", async () => {
    const secondChat = { ...testChat, id: "second-chat", title: "Второй чат" };
    let resolveFirst: ((value: { messages: AgentMemoryMessage[]; nextBeforeId: number | null }) => void) | undefined;
    let resolveSecond: ((value: { messages: AgentMemoryMessage[]; nextBeforeId: number | null }) => void) | undefined;
    api.fetchChats.mockResolvedValue([testChat, secondChat]);
    api.fetchMessages.mockImplementation((chatId: string) => new Promise((resolve) => {
      if (chatId === testChat.id) resolveFirst = resolve;
      else resolveSecond = resolve;
    }));

    render(<AgentTestConsolePage />);

    const secondButton = await screen.findByRole("button", { name: /Второй чат/ });
    await waitFor(() => expect(api.fetchMessages).toHaveBeenCalledWith(testChat.id));
    expect(resolveFirst).toBeTypeOf("function");
    fireEvent.click(secondButton);
    await waitFor(() => expect(api.fetchMessages).toHaveBeenCalledWith(secondChat.id));

    resolveSecond?.({
      messages: [storedMessage(5, "user", "Сообщение второго чата", JSON.stringify({ content: "Сообщение второго чата" }))],
      nextBeforeId: null,
    });
    await waitFor(() => expect(screen.getByText("Сообщение второго чата")).toBeInTheDocument());

    await act(async () => {
      resolveFirst?.({
        messages: [storedMessage(6, "user", "Запоздалое сообщение первого чата", JSON.stringify({ content: "Запоздалое сообщение первого чата" }))],
        nextBeforeId: null,
      });
    });
    expect(screen.getByText("Сообщение второго чата")).toBeInTheDocument();
    expect(screen.queryByText("Запоздалое сообщение первого чата")).not.toBeInTheDocument();
  });

  it("does not append a completed send from chat A into chat B", async () => {
    const secondChat = { ...testChat, id: "second-chat", title: "Второй чат" };
    let resolveSend: ((value: { reply: string; messages: AgentMemoryMessage[] }) => void) | undefined;
    api.fetchChats.mockResolvedValue([testChat, secondChat]);
    api.sendMessage.mockImplementation(() => new Promise((resolve) => { resolveSend = resolve; }));

    render(<AgentTestConsolePage />);

    const composer = await screen.findByPlaceholderText("Сообщение Workout-ассистенту…");
    fireEvent.change(composer, { target: { value: "Сообщение A" } });
    fireEvent.click(screen.getByRole("button", { name: "Отправить" }));
    fireEvent.click(await screen.findByRole("button", { name: /Второй чат/ }));

    await waitFor(() => expect(api.sendMessage).toHaveBeenCalledWith(testChat.id, "Сообщение A", []));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Второй чат" })).toBeInTheDocument());
    await act(async () => {
      resolveSend?.({
        reply: "Ответ A",
        messages: [storedMessage(7, "assistant", "Ответ только для A", JSON.stringify({ content: "Ответ только для A" }))],
      });
    });

    await waitFor(() => expect(screen.getByRole("button", { name: "Отправить" })).toBeEnabled());
    expect(screen.queryByText("Ответ только для A")).not.toBeInTheDocument();
  }, 10_000);

  it("does not replay a completed send after switching A to B and back to A", async () => {
    const secondChat = { ...testChat, id: "second-chat", title: "Второй чат" };
    const persistedReply = storedMessage(
      8,
      "assistant",
      "Уже сохранённый ответ A",
      JSON.stringify({ content: "Уже сохранённый ответ A" }),
    );
    let resolveSend: ((value: { reply: string; messages: AgentMemoryMessage[] }) => void) | undefined;
    let firstChatLoads = 0;
    api.fetchChats.mockResolvedValue([testChat, secondChat]);
    api.fetchMessages.mockImplementation((chatId: string) => {
      if (chatId === testChat.id) {
        firstChatLoads += 1;
        return Promise.resolve({
          messages: firstChatLoads === 1 ? [] : [persistedReply],
          nextBeforeId: null,
        });
      }
      return Promise.resolve({ messages: [], nextBeforeId: null });
    });
    api.sendMessage.mockImplementation(() => new Promise((resolve) => { resolveSend = resolve; }));

    render(<AgentTestConsolePage />);

    const composer = await screen.findByPlaceholderText("Сообщение Workout-ассистенту…");
    fireEvent.change(composer, { target: { value: "Сообщение A" } });
    fireEvent.click(screen.getByRole("button", { name: "Отправить" }));
    await waitFor(() => expect(api.sendMessage).toHaveBeenCalledWith(testChat.id, "Сообщение A", []));

    fireEvent.click(screen.getByRole("button", { name: /Второй чат/ }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Второй чат" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Тестовый чат/ }));
    await waitFor(() => expect(screen.getByText("Уже сохранённый ответ A")).toBeInTheDocument());
    fireEvent.change(composer, { target: { value: "Новый черновик A" } });

    await act(async () => {
      resolveSend?.({ reply: "Ответ A", messages: [persistedReply] });
    });

    await waitFor(() => expect(screen.getByRole("button", { name: "Отправить" })).toBeEnabled());
    expect(screen.getAllByText("Уже сохранённый ответ A")).toHaveLength(1);
    expect(composer).toHaveValue("Новый черновик A");
  }, 10_000);
});

const testChat: AgentTestChat = {
  id: "9b5fb277-2456-4e89-a428-ff8fcff56f9b",
  memoryChatId: -9_000_000_000_000_000,
  sandboxed: true,
  title: "Тестовый чат",
  messageCount: 0,
  createdAt: "2026-08-02T09:00:00Z",
  updatedAt: "2026-08-02T09:00:00Z",
};

function storedMessage(
  id: number,
  role: string,
  content: string | null,
  rawJson: string,
  toolCallId: string | null = null,
  toolName: string | null = null,
): AgentMemoryMessage {
  return {
    id,
    chatId: testChat.memoryChatId,
    role,
    content,
    toolCallId,
    toolName,
    excludedFromContext: false,
    compactedIntoSummaryId: null,
    isCompacted: false,
    createdAt: `2026-08-02T09:00:0${id}Z`,
    rawJson,
  };
}

const toolRound: AgentMemoryMessage[] = [
  storedMessage(
    1,
    "user",
    "Покажи упражнения",
    JSON.stringify({ role: "user", content: "Покажи упражнения" }),
  ),
  storedMessage(
    2,
    "assistant",
    "Сначала прочитаю список упражнений.",
    JSON.stringify({
      role: "assistant",
      content: "Сначала прочитаю список упражнений.",
      tool_calls: [{
        id: "tc-list",
        type: "function",
        function: { name: "listExercises", arguments: "{}" },
      }],
    }),
  ),
  storedMessage(
    3,
    "tool",
    "Жим, присед",
    JSON.stringify({
      role: "tool",
      content: "Жим, присед",
      tool_call_id: "tc-list",
      name: "listExercises",
    }),
    "tc-list",
    "listExercises",
  ),
  storedMessage(
    4,
    "assistant",
    "Упражнения загружены.",
    JSON.stringify({ role: "assistant", content: "Упражнения загружены." }),
  ),
];
