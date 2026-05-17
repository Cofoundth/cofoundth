type Size = "sm" | "md" | "lg" | "xl";

const SIZE_CLASSES: Record<Size, string> = {
  sm: "w-9 h-9 text-sm",
  md: "w-12 h-12 text-lg",
  lg: "w-14 h-14 text-xl",
  xl: "w-24 h-24 text-4xl",
};

type Props = {
  name: string | null | undefined;
  url?: string | null;
  size?: Size;
};

export function Avatar({ name, url, size = "md" }: Props) {
  const initial = (name ?? "?").trim().charAt(0).toUpperCase();
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
      className={`${cls} bg-navy flex items-center justify-center text-white font-serif shrink-0`}
    >
      {initial}
    </div>
  );
}
