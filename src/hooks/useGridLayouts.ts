import { useState } from "react";
import type { Layout, Layouts } from "react-grid-layout";

export const LS_KEY = "generators.layouts";
export const LG: Layout[] = [
  { i: "uuid",     x: 0, y: 0,  w: 4, h: 18, minW: 4, minH: 18 },
  { i: "password", x: 4, y: 0,  w: 4, h: 18, minW: 4, minH: 18 },
  { i: "number",   x: 8, y: 0,  w: 4, h: 18, minW: 4, minH: 18 },
  { i: "lorem",    x: 0, y: 16, w: 6, h: 18, minW: 4, minH: 18 },
];
export const DEFAULT_LAYOUTS: Layouts = { lg: LG, md: LG, sm: LG, xs: LG, xxs: LG };

export function useLayouts(key: string, defaults: Layouts) {
  const [layouts, setLayouts] = useState<Layouts>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as Layouts) : defaults;
    } catch {
      return defaults;
    }
  });

  const save = (next: Layouts) => {
    setLayouts(next);
    localStorage.setItem(key, JSON.stringify(next));
  };

  const reset = () => {
    localStorage.removeItem(key);
    setLayouts(defaults); // сбросить в дефолт
  };

  return { layouts, save, reset };
}