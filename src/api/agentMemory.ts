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
  images?: string[];
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

export type AgentMemoryChatTurnResult = {
  reply: string;
  messages: AgentMemoryMessage[];
};

const BASE = "/api/admin/agent-memory";

export async function fetchAgentMemoryChats(): Promise<AgentMemoryChatSummary[]> {
  return apiClient.get<AgentMemoryChatSummary[]>(`${BASE}/chats`);
}

export async function fetchAgentMemoryChat(chatId: number): Promise<AgentMemoryChatDetail> {
  return apiClient.get<AgentMemoryChatDetail>(`${BASE}/chats/${chatId}`);
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
  );
}

export async function appendAgentMessage(
  chatId: number,
  role: "user" | "assistant" | "system",
  content: string,
  images?: string[],
): Promise<AgentMemoryMessage> {
  return apiClient.post<AgentMemoryMessage>(
    `${BASE}/chats/${chatId}/messages`,
    { role, content, images },
  );
}

export async function simulateAgentChat(
  chatId: number,
  content: string,
  images?: string[],
): Promise<AgentMemoryChatTurnResult> {
  return apiClient.post<AgentMemoryChatTurnResult>(
    `${BASE}/chats/${chatId}/chat`,
    { content, images },
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
  );
}

export async function deleteAgentFact(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/facts/${id}`);
}

export async function deleteAgentSummary(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/summaries/${id}`);
}

export async function updateMessageExcluded(
  id: number,
  excludedFromContext: boolean,
): Promise<AgentMemoryMessage> {
  return apiClient.patch<AgentMemoryMessage>(
    `${BASE}/messages/${id}`,
    { excludedFromContext },
  );
}

export async function deleteAgentMessage(id: number): Promise<void> {
  await apiClient.delete(`${BASE}/messages/${id}`);
}

export async function compactAgentMemory(
  chatId: number,
  keepRecent = 0,
): Promise<AgentMemoryCompactResult> {
  return apiClient.post<AgentMemoryCompactResult>(
    `${BASE}/chats/${chatId}/compact?keepRecent=${keepRecent}`,
    undefined,
  );
}

export async function clearAgentDialog(chatId: number): Promise<void> {
  await apiClient.delete(`${BASE}/chats/${chatId}/dialog`);
}
