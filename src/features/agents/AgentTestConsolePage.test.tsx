import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
