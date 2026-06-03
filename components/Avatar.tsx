type Size = "sm" | "md" | "lg" | "xl";

const SIZE_CLASSES: Record<Size, string> = {
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

// Muted, editorial palette (all dark enough for white text). A name always
// maps to the same colour — like Google's letter avatars, but on-brand.
const AVATAR_COLORS = [
  "#0A1F44", // navy
  "#1F4E4A", // deep teal
  "#6B2737", // burgundy
  "#2E4A34", // forest
  "#3A4A5A", // slate
  "#4A2E4A", // plum
  "#5A4632", // bronze
  "#2E2E5A", // indigo
  "#7A5A1F", // dark ochre
  "#43455C", // muted purple-gray
];

export function colorFor(name: string | null | undefined): string {
  const s = (name ?? "").trim() || "?";
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function Avatar({ name, url, size = "md" }: Props) {
  const cls = SIZE_CLASSES[size];

  if (url) {
    return (
      <div className={`${cls} bg-navy overflow-hidden shrink-0`}>
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
      className={`${cls} flex items-center justify-center text-white font-serif tracking-wide shrink-0`}
      style={{ backgroundColor: colorFor(name) }}
    >
      {getInitials(name)}
    </div>
  );
}
