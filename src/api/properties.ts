import { apiClient } from "./client";
import { apiEndpoints } from "./endpoints";

export type PropertyType = "BOOLEAN" | "INT" | "LONG" | "DOUBLE" | "STRING" | "OBJECT";

export type PropertyEditor = "DEFAULT" | "TEXTAREA";

export type RuntimeProperty = {
  key: string;
  type: PropertyType;
  objectType: string | null;
  description: string;
  tags: string[];
  value: unknown;
  defaultValue: unknown;
  editor: PropertyEditor;
  updatedAt: string | null;
  updatedBy: string | null;
};

export async function fetchProperties(): Promise<RuntimeProperty[]> {
  return apiClient.get<RuntimeProperty[]>("/api/admin/settings");
}

export async function updateProperty(key: string, value: unknown): Promise<RuntimeProperty> {
  return apiClient.put<RuntimeProperty>(apiEndpoints.admin.setting(key), { value });
}
