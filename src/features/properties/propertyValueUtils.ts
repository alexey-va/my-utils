import type { PropertyType, RuntimeProperty } from "../../api/properties";

export function valueAsString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  return String(value);
}

export function parseValueForSave(property: RuntimeProperty, draft: unknown): unknown {
  if (property.type === "OBJECT") {
    const raw = typeof draft === "string" ? draft : JSON.stringify(draft);
    return JSON.parse(raw) as unknown;
  }
  if (property.type === "STRING" && typeof draft === "string") {
    return draft;
  }
  return draft;
}

export function valuesEqual(property: RuntimeProperty, draft: unknown, stored: unknown): boolean {
  if (property.type === "BOOLEAN") {
    return Boolean(draft) === Boolean(stored);
  }
  if (property.type === "INT" || property.type === "LONG" || property.type === "DOUBLE") {
    const draftNum = Number(draft);
    const storedNum = Number(stored);
    if (!Number.isFinite(draftNum) || !Number.isFinite(storedNum)) {
      return false;
    }
    return draftNum === storedNum;
  }
  if (property.type === "OBJECT") {
    try {
      const draftJson =
        typeof draft === "string" ? JSON.parse(draft) : draft;
      const storedJson =
        typeof stored === "string" ? JSON.parse(stored) : stored;
      return JSON.stringify(draftJson) === JSON.stringify(storedJson);
    } catch {
      return false;
    }
  }
  return valueAsString(draft) === valueAsString(stored);
}

export function typeColor(type: PropertyType): string {
  switch (type) {
    case "BOOLEAN":
      return "blue";
    case "INT":
    case "LONG":
    case "DOUBLE":
      return "green";
    case "STRING":
      return "gold";
    case "OBJECT":
      return "purple";
    default:
      return "default";
  }
}
