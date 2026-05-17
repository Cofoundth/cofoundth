// Cofoundee brand marks — inline SVG so they render without an extra
// HTTP request and inherit color tokens.

type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, { w: number; h: number; fontSize: number; dotR: number; cx: number; cy: number; tx: number; ty: number }> = {
  sm: { w: 36, h: 36, fontSize: 24, dotR: 2.5, cx: 27, cy: 25, tx: 9, ty: 27 },
  md: { w: 40, h: 40, fontSize: 28, dotR: 2.5, cx: 30, cy: 28, tx: 10, ty: 30 },
  lg: { w: 56, h: 56, fontSize: 40, dotR: 3.5, cx: 42, cy: 39, tx: 14, ty: 42 },
};

export function BrandMark({ size = "md" }: { size?: Size }) {
  const s = SIZES[size];
  return (
    <svg
      width={s.w}
      height={s.h}
      viewBox={`0 0 ${s.w} ${s.h}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Cofoundee"
      className="shrink-0"
    >
      <rect width={s.w} height={s.h} fill="#0A1F44" />
      <text
        x={s.tx}
        y={s.ty}
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize={s.fontSize}
        fontWeight={500}
        fill="#FFFFFF"
      >
        C
      </text>
      <circle cx={s.cx} cy={s.cy} r={s.dotR} fill="#B8941F" />
    </svg>
  );
}

type WordmarkProps = {
  variant?: "dark" | "light";
  className?: string;
};

export function Wordmark({ variant = "dark", className }: WordmarkProps) {
  const textColor = variant === "light" ? "text-white" : "text-navy";
  return (
    <span
      className={`font-serif text-xl tracking-tight leading-none ${textColor} ${className ?? ""}`}
    >
      cofoundee<span className="text-gold font-bold">.</span>
    </span>
  );
}
