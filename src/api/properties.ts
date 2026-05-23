import { apiClient } from "./client";

export type PropertyType = "BOOLEAN" | "INT" | "LONG" | "DOUBLE" | "STRING" | "OBJECT";

export type PropertyEditor = "DEFAULT" | "TEXTAREA";

export type RuntimeProperty = {
  key: string;
  type: PropertyType;
  objectType: string | null;
  description: string;
  value: unknown;
  defaultValue: unknown;
  editor: PropertyEditor;
  updatedAt: string | null;
  updatedBy: string | null;
};

export async function fetchProperties(): Promise<RuntimeProperty[]> {
  return apiClient.get<RuntimeProperty[]>("/api/admin/settings", { skipAuth: true });
}

export async function updateProperty(key: string, value: unknown): Promise<RuntimeProperty> {
  const path = `/api/admin/settings/${encodeURIComponent(key)}`;
  return apiClient.put<RuntimeProperty>(path, { value }, { skipAuth: true });
}
