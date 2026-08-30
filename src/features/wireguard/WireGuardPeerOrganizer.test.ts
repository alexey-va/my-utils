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
});
