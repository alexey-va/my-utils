import { arrayMove } from "@dnd-kit/sortable";
import type { WireGuardPeer, WireGuardPeerCategory } from "./types";

export type WireGuardDragTarget =
  | { type: "category"; categoryId: string }
  | { type: "peer"; peerId: string };

function normalizePeerOrder(peers: WireGuardPeer[]): WireGuardPeer[] {
  return peers.map((peer, sortOrder) => ({ ...peer, sortOrder }));
}

function normalizeCategoryOrder(categories: WireGuardPeerCategory[]): WireGuardPeerCategory[] {
  return categories.map((category, sortOrder) => ({ ...category, sortOrder }));
}

function flattenPeers(
  buckets: Map<string, WireGuardPeer[]>,
  categories: WireGuardPeerCategory[],
  original: WireGuardPeer[],
): WireGuardPeer[] {
  const knownNames = new Set(categories.map((category) => category.name));
  const ordered = categories.flatMap((category) => buckets.get(category.name) ?? []);
  const unknown = original.filter((peer) => !knownNames.has(peer.category));
  return normalizePeerOrder([...ordered, ...unknown]);
}

/** Pure sortable projection shared by pointer/keyboard drag and focused tests. */
export function movePeerForDrag(
  peers: WireGuardPeer[],
  categories: WireGuardPeerCategory[],
  peerId: string,
  target: WireGuardDragTarget,
): WireGuardPeer[] {
  const activePeer = peers.find((peer) => peer.id === peerId);
  if (!activePeer || (target.type === "peer" && target.peerId === peerId)) return peers;

  const targetCategory = target.type === "category"
    ? categories.find((category) => category.id === target.categoryId)?.name
    : peers.find((peer) => peer.id === target.peerId)?.category;
  if (!targetCategory) return peers;

  const buckets = new Map<string, WireGuardPeer[]>();
  categories.forEach((category) => buckets.set(
    category.name,
    peers.filter((peer) => peer.category === category.name),
  ));

  if (activePeer.category === targetCategory && target.type === "peer") {
    const scoped = buckets.get(targetCategory) ?? [];
    const activeIndex = scoped.findIndex((peer) => peer.id === peerId);
    const overIndex = scoped.findIndex((peer) => peer.id === target.peerId);
    if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) return peers;
    buckets.set(targetCategory, arrayMove(scoped, activeIndex, overIndex));
    return flattenPeers(buckets, categories, peers);
  }

  buckets.forEach((items, category) => {
    buckets.set(category, items.filter((peer) => peer.id !== peerId));
  });
  const targetPeers = [...(buckets.get(targetCategory) ?? [])];
  const targetIndex = target.type === "peer"
    ? targetPeers.findIndex((peer) => peer.id === target.peerId)
    : targetPeers.length;
  targetPeers.splice(targetIndex < 0 ? targetPeers.length : targetIndex, 0, {
    ...activePeer,
    category: targetCategory,
  });
  buckets.set(targetCategory, targetPeers);
  return flattenPeers(buckets, categories, peers);
}

export function moveCategoryForDrag(
  categories: WireGuardPeerCategory[],
  categoryId: string,
  targetCategoryId: string,
): WireGuardPeerCategory[] {
  const activeIndex = categories.findIndex((category) => category.id === categoryId);
  const overIndex = categories.findIndex((category) => category.id === targetCategoryId);
  if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) return categories;
  return normalizeCategoryOrder(arrayMove(categories, activeIndex, overIndex));
}
