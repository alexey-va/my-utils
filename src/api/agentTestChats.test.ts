import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearAgentTestChat,
  createAgentTestChat,
  deleteAgentTestChat,
  fetchAgentTestChat,
  fetchAgentTestChatMessages,
  fetchAgentTestChats,
  renameAgentTestChat,
  sendAgentTestChatMessage,
} from "./agentTestChats";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("agentTestChats API", () => {
  it("uses the admin test-chat lifecycle routes and JSON payloads", async () => {
    const chat = {
      id: "9b5fb277-2456-4e89-a428-ff8fcff56f9b",
      memoryChatId: -9_000_000_000_000_000,
      userContextChatId: 303_179_278,
      title: "Тест",
      messageCount: 0,
      createdAt: "2026-08-02T09:00:00Z",
      updatedAt: "2026-08-02T09:00:00Z",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([chat]))
      .mockResolvedValueOnce(jsonResponse(chat))
      .mockResolvedValueOnce(jsonResponse(chat))
      .mockResolvedValueOnce(jsonResponse(chat))
      .mockResolvedValueOnce(jsonResponse({ messages: [], nextBeforeId: null }))
      .mockResolvedValueOnce(jsonResponse({ reply: "Привет", messages: [] }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchAgentTestChats();
    await createAgentTestChat("Тест");
    await fetchAgentTestChat(chat.id);
    await renameAgentTestChat(chat.id, "Новый заголовок");
    await fetchAgentTestChatMessages(chat.id, 123, 25);
    await sendAgentTestChatMessage(chat.id, "Покажи упражнения", ["data:image/png;base64,abc"]);
    await clearAgentTestChat(chat.id);
    await deleteAgentTestChat(chat.id);

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/admin/agent-test-chats",
      "/api/admin/agent-test-chats",
      `/api/admin/agent-test-chats/${chat.id}`,
      `/api/admin/agent-test-chats/${chat.id}`,
      `/api/admin/agent-test-chats/${chat.id}/messages?limit=25&beforeId=123`,
      `/api/admin/agent-test-chats/${chat.id}/messages`,
      `/api/admin/agent-test-chats/${chat.id}/messages`,
      `/api/admin/agent-test-chats/${chat.id}`,
    ]);
    expect(fetchMock.mock.calls[1][1]).toEqual(
      expect.objectContaining({ method: "POST", body: JSON.stringify({ title: "Тест" }) }),
    );
    expect(fetchMock.mock.calls[3][1]).toEqual(
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ title: "Новый заголовок" }),
      }),
    );
    expect(fetchMock.mock.calls[5][1]).toEqual(
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          content: "Покажи упражнения",
          images: ["data:image/png;base64,abc"],
        }),
      }),
    );
    expect(fetchMock.mock.calls[6][1]).toEqual(expect.objectContaining({ method: "DELETE" }));
    expect(fetchMock.mock.calls[7][1]).toEqual(expect.objectContaining({ method: "DELETE" }));
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
