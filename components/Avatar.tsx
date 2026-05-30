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
  const cls = SIZE_CLASSES[size];
  // Fall back to the brand mascot when a member hasn't uploaded a photo.
  const src = url || "/default-avatar.png";

  return (
    <div className={`${cls} bg-white overflow-hidden shrink-0`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={name ?? "Profile"}
        className="w-full h-full object-cover"
      />
    </div>
  );
}
