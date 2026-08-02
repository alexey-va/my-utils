import { apiClient } from "./client";
import { apiEndpoints } from "./endpoints";
import type {
  AgentMemoryChatTurnResult,
  AgentMemoryMessagePage,
} from "./agentMemory";

export type AgentTestChat = {
  id: string;
  memoryChatId: number;
  userContextChatId: number;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
};

export function fetchAgentTestChats(): Promise<AgentTestChat[]> {
  return apiClient.get<AgentTestChat[]>(apiEndpoints.admin.agentTestChats);
}

export function createAgentTestChat(title: string): Promise<AgentTestChat> {
  return apiClient.post<AgentTestChat>(
    apiEndpoints.admin.agentTestChats,
    { title },
  );
}

export function fetchAgentTestChat(id: string): Promise<AgentTestChat> {
  return apiClient.get<AgentTestChat>(apiEndpoints.admin.agentTestChat(id));
}

export function renameAgentTestChat(id: string, title: string): Promise<AgentTestChat> {
  return apiClient.patch<AgentTestChat>(
    apiEndpoints.admin.agentTestChat(id),
    { title },
  );
}

export function fetchAgentTestChatMessages(
  id: string,
  beforeId?: number,
  limit = 50,
): Promise<AgentMemoryMessagePage> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (beforeId != null) {
    params.set("beforeId", String(beforeId));
  }
  return apiClient.get<AgentMemoryMessagePage>(
    `${apiEndpoints.admin.agentTestChatMessages(id)}?${params.toString()}`,
  );
}

export function sendAgentTestChatMessage(
  id: string,
  content: string,
  images?: string[],
): Promise<AgentMemoryChatTurnResult> {
  return apiClient.post<AgentMemoryChatTurnResult>(
    apiEndpoints.admin.agentTestChatMessages(id),
    { content, images },
  );
}

export async function clearAgentTestChat(id: string): Promise<void> {
  await apiClient.delete(apiEndpoints.admin.agentTestChatMessages(id));
}

export async function deleteAgentTestChat(id: string): Promise<void> {
  await apiClient.delete(apiEndpoints.admin.agentTestChat(id));
}
