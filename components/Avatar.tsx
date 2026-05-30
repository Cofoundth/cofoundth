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
      className={`${cls} bg-navy flex items-center justify-center text-white font-serif tracking-wide shrink-0`}
    >
      {getInitials(name)}
    </div>
  );
}
