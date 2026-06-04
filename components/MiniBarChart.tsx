// Dependency-free daily bar chart for the admin overview. Server-safe.
export function MiniBarChart({
  data,
  color = "#0A1F44",
}: {
  data: number[];
  color?: string;
}) {
  const max = Math.max(1, ...data);
  const n = data.length || 1;
  const slot = 100 / n;
  return (
    <svg
      viewBox="0 0 100 32"
      preserveAspectRatio="none"
      className="w-full h-16"
      aria-hidden
    >
      {data.map((v, i) => {
        const h = (v / max) * 30;
        return (
          <rect
            key={i}
            x={i * slot + slot * 0.15}
            y={32 - h}
            width={slot * 0.7}
            height={h}
            fill={color}
            opacity={0.85}
          />
        );
      })}
    </svg>
  );
}
