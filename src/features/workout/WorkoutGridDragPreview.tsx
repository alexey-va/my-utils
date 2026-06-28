import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { WorkoutGridActiveDrag } from "./workoutGridDnD";
import { readCellClientRect } from "./workoutGridDnD";

type HoverTarget = {
  exerciseId: string;
  date: string;
};

type PreviewRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type Props = {
  drag: WorkoutGridActiveDrag;
  pointer: { x: number; y: number };
  hoverTarget: HoverTarget | null;
};

export default function WorkoutGridDragPreview({
  drag,
  pointer,
  hoverTarget,
}: Props) {
  const [slotRect, setSlotRect] = useState<PreviewRect | null>(null);

  useLayoutEffect(() => {
    const updateSlot = () => {
      if (!hoverTarget) {
        setSlotRect(null);
        return;
      }
      const targetRect = readCellClientRect(hoverTarget.exerciseId, hoverTarget.date);
      setSlotRect(targetRect);
    };

    updateSlot();
    window.addEventListener("scroll", updateSlot, true);
    window.addEventListener("resize", updateSlot);
    return () => {
      window.removeEventListener("scroll", updateSlot, true);
      window.removeEventListener("resize", updateSlot);
    };
  }, [hoverTarget]);

  const ghostX = pointer.x - drag.grabOffsetX;
  const ghostY = pointer.y - drag.grabOffsetY;

  return createPortal(
    <div className="workout-grid__drag-layer" data-workout-drag-overlay>
      {slotRect ? (
        <div
          className="workout-grid__drag-slot"
          style={{
            left: slotRect.left,
            top: slotRect.top,
            width: slotRect.width,
            height: slotRect.height,
          }}
        >
          <div className={`workout-grid__drag-slot-cell ${drag.previewClass}`}>
            <span className="workout-grid__drag-slot-label">{drag.display}</span>
          </div>
        </div>
      ) : null}
      <div
        className="workout-grid__drag-ghost"
        style={{
          width: drag.cellWidth,
          height: drag.cellHeight,
          transform: `translate3d(${ghostX}px, ${ghostY}px, 0)`,
        }}
      >
        <div className={`workout-grid__drag-ghost-cell ${drag.previewClass}`}>
          <span className="workout-grid__drag-ghost-label">{drag.display}</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
