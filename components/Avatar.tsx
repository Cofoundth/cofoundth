type Size = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE_CLASSES: Record<Size, string> = {
  // 24px, to sit INLINE in a metadata row next to a chip and a date rather
  // than on a line of its own — /products' card is the first caller. 12px
  // initials, not 11: the glyphs can be Thai (getInitials takes the first
  // letter of a name, so "ณัฐพล ว." gives "ณว"), and 12px is the floor
  // CLAUDE.md sets for anything translatable. The fixed `w-6 h-6` box is what
  // makes this safe at all — the decorative-glyph exception is for glyphs
  // sized by a box, never by a line-height.
  xs: "w-6 h-6 text-xs",
  sm: "w-9 h-9 text-sm",
  md: "w-12 h-12 text-base",
  lg: "w-14 h-14 text-lg",
  xl: "w-24 h-24 text-3xl",
};

type Props = {
  name: string | null | undefined;
  url?: string | null;
  size?: Size;
};

// Google-style initials: first letter of the first and last word (max 2).
export function getInitials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (
    parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
  ).toUpperCase();
}

// Deterministic per-name colour — a name always maps to the same one. Derived
// across the full hue range instead of a fixed ~10-swatch palette (which
// collided constantly: with 10 colours, ~5 users already share one). Saturation
// + lightness stay muted and dark so white initials are readable and it reads
// on-brand/editorial rather than neon.
export function colorFor(name: string | null | undefined): string {
  const s = (name ?? "").trim() || "?";
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 38% 30%)`;
}

export function Avatar({ name, url, size = "md" }: Props) {
  const cls = SIZE_CLASSES[size];

  if (url) {
    return (
      <div className={`${cls} rounded-full bg-navy overflow-hidden shrink-0`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={name ?? "Profile"}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`${cls} rounded-full flex items-center justify-center text-white font-serif tracking-wide shrink-0`}
      style={{ backgroundColor: colorFor(name) }}
    >
      {getInitials(name)}
    </div>
  );
}
