import { describe, expect, it } from "vitest";
import type { WireGuardPeer, WireGuardPeerCategory } from "./types";
import { moveCategoryForDrag, movePeerForDrag } from "./wireGuardPeerOrder";

const category = (id: string, name: string, sortOrder: number): WireGuardPeerCategory => ({
  id,
  name,
  sortOrder,
  createdAt: "2026-08-30T12:00:00Z",
  updatedAt: "2026-08-30T12:00:00Z",
});

const peer = (id: string, name: string, categoryName: string, sortOrder: number) => ({
  id,
  name,
  category: categoryName,
  sortOrder,
} as WireGuardPeer);

describe("WireGuardPeerOrganizer projections", () => {
  const categories = [
    category("user", "Пользовательские", 0),
    category("service", "Служебные", 1),
  ];

  it("opens a stable gap by reordering neighboring peers", () => {
    const phone = peer("phone", "Phone", "Пользовательские", 0);
    const tablet = peer("tablet", "Tablet", "Пользовательские", 1);

    const moved = movePeerForDrag([phone, tablet], categories, tablet.id, {
      type: "peer",
      peerId: phone.id,
    });

    expect(moved.map((item) => item.id)).toEqual([tablet.id, phone.id]);
    expect(moved.map((item) => item.sortOrder)).toEqual([0, 1]);
  });

  it("moves a peer across category containers and persists the new category", () => {
    const phone = peer("phone", "Phone", "Пользовательские", 0);
    const proxy = peer("proxy", "Proxy", "Служебные", 1);

    const moved = movePeerForDrag([phone, proxy], categories, phone.id, {
      type: "category",
      categoryId: "service",
    });

    expect(moved.map((item) => item.id)).toEqual([proxy.id, phone.id]);
    expect(moved.find((item) => item.id === phone.id)?.category).toBe("Служебные");
  });

  it("reorders category records independently from their peers", () => {
    const moved = moveCategoryForDrag(categories, "service", "user");

    expect(moved.map((item) => item.id)).toEqual(["service", "user"]);
    expect(moved.map((item) => item.sortOrder)).toEqual([0, 1]);
  });

  it("returns the original projection for self-drops and unknown targets", () => {
    const phone = peer("phone", "Phone", "Пользовательские", 0);
    const peers = [phone];

    expect(movePeerForDrag(peers, categories, phone.id, { type: "peer", peerId: phone.id })).toBe(peers);
    expect(movePeerForDrag(peers, categories, phone.id, { type: "peer", peerId: "missing" })).toBe(peers);
    expect(movePeerForDrag(peers, categories, "missing", { type: "category", categoryId: "user" })).toBe(peers);
  });

  it("appends a peer to an empty category and preserves relative order elsewhere", () => {
    const phone = peer("phone", "Phone", "Пользовательские", 0);
    const tablet = peer("tablet", "Tablet", "Пользовательские", 1);

    const moved = movePeerForDrag([phone, tablet], categories, phone.id, {
      type: "category",
      categoryId: "service",
    });

    expect(moved.map(({ id, category: name, sortOrder }) => [id, name, sortOrder])).toEqual([
      ["tablet", "Пользовательские", 0],
      ["phone", "Служебные", 1],
    ]);
  });

  it("inserts before a peer when crossing categories and keeps unknown categories last", () => {
    const phone = peer("phone", "Phone", "Пользовательские", 0);
    const proxy = peer("proxy", "Proxy", "Служебные", 1);
    const monitor = peer("monitor", "Monitor", "Служебные", 2);
    const legacy = peer("legacy", "Legacy", "Импортированные", 3);

    const moved = movePeerForDrag([phone, proxy, monitor, legacy], categories, phone.id, {
      type: "peer",
      peerId: monitor.id,
    });

    expect(moved.map(({ id, category: name, sortOrder }) => [id, name, sortOrder])).toEqual([
      ["proxy", "Служебные", 0],
      ["phone", "Служебные", 1],
      ["monitor", "Служебные", 2],
      ["legacy", "Импортированные", 3],
    ]);
  });

  it("keeps category identity for invalid drops and normalizes a valid move", () => {
    expect(moveCategoryForDrag(categories, "user", "user")).toBe(categories);
    expect(moveCategoryForDrag(categories, "missing", "service")).toBe(categories);

    const moved = moveCategoryForDrag(categories, "user", "service");
    expect(moved.map(({ id, sortOrder }) => [id, sortOrder])).toEqual([
      ["service", 0],
      ["user", 1],
    ]);
  });
});
