import type { Layouts } from "react-grid-layout";
import type { ReactNode } from "react";

export type BoardProps = {
  lsKey: string;
  defaultLayouts: Layouts;
  items: Record<string, ReactNode>;
  rowHeight: number;
  cols: Record<string, number>;
  breakpoints: Record<string, number>;
};
