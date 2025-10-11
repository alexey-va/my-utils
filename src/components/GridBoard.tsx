import { Responsive, WidthProvider, type Layouts } from "react-grid-layout";
import { useLayouts } from "../hooks/useGridLayouts";
import type { BoardProps } from "../types/grid";

const ResponsiveGridLayout = WidthProvider(Responsive);

export default function GridBoard({
  lsKey,
  defaultLayouts,
  items,
  rowHeight,
  cols,
  breakpoints,
  externalReset,   // новая пропса
}: BoardProps & { externalReset?: (fn: () => void) => void }) {
  const { layouts, save, reset } = useLayouts(lsKey, defaultLayouts);

  // при маунте отдать reset наружу
  if (externalReset) externalReset(reset);

  return (
    <ResponsiveGridLayout
      className="layout"
      layouts={layouts}
      onLayoutChange={(_, all) => save(all)}
      breakpoints={breakpoints}
      cols={cols}
      rowHeight={rowHeight}
      isResizable
      isDraggable
      draggableHandle=".drag-handle"
      preventCollision={false}
      compactType="vertical"
      margin={[16, 16]}
      containerPadding={[0, 0]}
    >
      {Object.entries(items).map(([key, node]) => (
        <div key={key}>{node}</div>
      ))}
    </ResponsiveGridLayout>
  );
}
