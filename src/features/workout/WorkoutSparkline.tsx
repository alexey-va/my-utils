type Props = {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
};

export default function WorkoutSparkline({ values, width = 56, height = 22, color }: Props) {
  if (values.length < 2) {
    return <svg className="workout-sparkline workout-sparkline--empty" width={width} height={height} aria-hidden />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = 2;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const points = values
    .map((v, i) => {
      const x = pad + (i / (values.length - 1)) * innerW;
      const y = pad + innerH - ((v - min) / range) * innerH;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      className="workout-sparkline"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={color ? { color } : undefined}
      aria-hidden
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}
