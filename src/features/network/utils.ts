import type { NetworkNode } from "./types";

export const ONLINE_WINDOW_MS = 90_000;

export function nodeStatus(node: NetworkNode, now = Date.now()): "online" | "offline" | "disabled" {
  if (node.disabled) return "disabled";
  if (node.last_seen && now - new Date(node.last_seen).getTime() < ONLINE_WINDOW_MS) {
    return "online";
  }
  return "offline";
}
