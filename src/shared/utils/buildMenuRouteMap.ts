import type { TreeMenuItem } from "@refinedev/core";

/** Map Refine menu item keys to list routes for programmatic navigation. */
export function buildMenuRouteMap(tree: TreeMenuItem[]): Map<string, string> {
  const map = new Map<string, string>();

  const walk = (items: TreeMenuItem[]) => {
    for (const item of items) {
      if (item.list) {
        map.set(String(item.key), String(item.list));
      }
      if (item.children.length > 0) {
        walk(item.children);
      }
    }
  };

  walk(tree);
  return map;
}
