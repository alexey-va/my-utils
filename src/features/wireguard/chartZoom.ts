export type ChartPoint = { x: number; y: number };

export type ChartSize = { width: number; height: number };

export type ChartZoomDomain = {
  x: [number, number];
  y: [number, number];
};

const MIN_SELECTION_SIZE = 8;

const clamp = (value: number, minimum: number, maximum: number) => (
  Math.max(minimum, Math.min(maximum, value))
);

export function selectionToZoomDomain(
  start: ChartPoint,
  end: ChartPoint,
  size: ChartSize,
  domain: ChartZoomDomain,
): ChartZoomDomain | null {
  if (size.width <= 0 || size.height <= 0) return null;

  const startX = clamp(start.x, 0, size.width);
  const endX = clamp(end.x, 0, size.width);
  const startY = clamp(start.y, 0, size.height);
  const endY = clamp(end.y, 0, size.height);
  if (Math.abs(endX - startX) < MIN_SELECTION_SIZE || Math.abs(endY - startY) < MIN_SELECTION_SIZE) {
    return null;
  }

  const [xMinimum, xMaximum] = domain.x;
  const [yMinimum, yMaximum] = domain.y;
  const toX = (value: number) => xMinimum + (value / size.width) * (xMaximum - xMinimum);
  const toY = (value: number) => yMaximum - (value / size.height) * (yMaximum - yMinimum);
  const mappedX = [toX(startX), toX(endX)].sort((left, right) => left - right) as [number, number];
  const mappedY = [toY(startY), toY(endY)].sort((left, right) => left - right) as [number, number];

  return { x: mappedX, y: mappedY };
}
