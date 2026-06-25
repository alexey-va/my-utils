import { apiClient } from "./client";

export type AgentMemoryChatSummary = {
  chatId: number;
  messageCount: number;
  factCount: number;
  summaryCount: number;
  lastActivityAt: string | null;
};

export type AgentMemoryFact = {
  id: string;
  chatId: number;
  content: string;
  confidence: number;
  createdAt: string;
  updatedAt: string;
};

export type AgentMemorySummary = {
  id: string;
  sequence: number;
  summaryText: string;
  coversMessageIdFrom: number;
  coversMessageIdTo: number;
  sourceMessageCount: number;
  model: string | null;
  tokensBefore: number | null;
  tokensAfter: number | null;
  createdAt: string;
};

export type AgentMemoryMessage = {
  id: number;
  chatId: number;
  role: string;
  content: string | null;
  toolCallId: string | null;
  toolName: string | null;
  excludedFromContext: boolean;
  compactedIntoSummaryId: string | null;
  isCompacted: boolean;
  createdAt: string;
  rawJson: string;
};

export type AgentMemoryCompactionPreview = {
  compactionAvailable: boolean;
  compactableCount: number;
};

export type AgentMemoryChatDetail = {
  chatId: number;
  stats: AgentMemoryChatSummary;
  summaries: AgentMemorySummary[];
  facts: AgentMemoryFact[];
  recentContextMessageCount: number;
  compaction: AgentMemoryCompactionPreview;
};

export type AgentMemoryMessagePage = {
  messages: AgentMemoryMessage[];
  nextBeforeId: number | null;
};

export type AgentMemoryCompactResult = {
  compacted: boolean;
  messageCount: number;
  summaryId: string | null;
  reason?: string | null;
};

const BASE = "/api/admin/agent-memory";

export async function fetchAgentMemoryChats(): Promise<AgentMemoryChatSummary[]> {
  return apiClient.get<AgentMemoryChatSummary[]>(`${BASE}/chats`, { skipAuth: true });
}

export async function fetchAgentMemoryChat(chatId: number): Promise<AgentMemoryChatDetail> {
  return apiClient.get<AgentMemoryChatDetail>(`${BASE}/chats/${chatId}`, { skipAuth: true });
}

export async function fetchAgentMemoryMessages(
  chatId: number,
  beforeId?: number,
  limit = 50,
): Promise<AgentMemoryMessagePage> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (beforeId != null) {
    params.set("beforeId", String(beforeId));
  }
  return apiClient.get<AgentMemoryMessagePage>(
    `${BASE}/chats/${chatId}/messages?${params.toString()}`,
    { skipAuth: true },
  );
}

export async function appendAgentMessage(
  chatId: number,
  role: "user" | "assistant" | "system",
  content: string,
): Promise<AgentMemoryMessage> {
  return apiClient.post<AgentMemoryMessage>(
    `${BASE}/chats/${chatId}/messages`,
    { role, content },
    { skipAuth: true },
  );
}

export async function createAgentFact(
  chatId: number,
  content: string,
  confidence?: number,
): Promise<AgentMemoryFact> {
  return apiClient.post<AgentMemoryFact>(
    `${BASE}/chats/${chatId}/facts`,
    { content, confidence },
    { skipAuth: true },
  );
}

export async function updateAgentFact(
  id: string,
  content: string,
  confidence?: number,
): Promise<AgentMemoryFact> {
  return apiClient.put<AgentMemoryFact>(
    `${BASE}/facts/${id}`,
    { content, confidence },
    { skipAuth: true },
  );
}

export async function deleteAgentFact(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/facts/${id}`, { skipAuth: true });
}

export async function deleteAgentSummary(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/summaries/${id}`, { skipAuth: true });
}

export async function updateMessageExcluded(
  id: number,
  excludedFromContext: boolean,
): Promise<AgentMemoryMessage> {
  return apiClient.patch<AgentMemoryMessage>(
    `${BASE}/messages/${id}`,
    { excludedFromContext },
    { skipAuth: true },
  );
}

export async function deleteAgentMessage(id: number): Promise<void> {
  await apiClient.delete(`${BASE}/messages/${id}`, { skipAuth: true });
}

export async function compactAgentMemory(
  chatId: number,
  keepRecent = 0,
): Promise<AgentMemoryCompactResult> {
  return apiClient.post<AgentMemoryCompactResult>(
    `${BASE}/chats/${chatId}/compact?keepRecent=${keepRecent}`,
    undefined,
    { skipAuth: true },
  );
}

export async function clearAgentDialog(chatId: number): Promise<void> {
  await apiClient.delete(`${BASE}/chats/${chatId}/dialog`, { skipAuth: true });
}
