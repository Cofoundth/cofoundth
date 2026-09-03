// Cofoundee — shared UI primitives barrel.
//
// Import from "@/components/ui" rather than the individual files.
//
// Every primitive here is CLIENT-SAFE and carries NO "use client" directive:
// none of them use hooks or state, so they render from server components and
// client components alike. That is also why NONE of them translate internally
// — they take already-translated strings as props (`label`, `title`,
// `description`, children), so a server page can pass `await tServer("…")` and
// a client component can pass `tr("…")` from useT(). Do not add useT() to
// these files; it would force "use client" and lock them out of server pages.

export { cn } from "./cn";

export { Section, type SectionProps } from "./Section";

export {
  Button,
  LinkButton,
  buttonClasses,
  type ButtonProps,
  type LinkButtonProps,
  type ButtonVariant,
  type ButtonSize,
} from "./Button";

export {
  Input,
  Textarea,
  type InputProps,
  type TextareaProps,
  type FieldSize,
  type ResizeMode,
} from "./Input";

export { Card, type CardProps, type CardPadding } from "./Card";

export { CardLabel, CardChip, CardPill, StageEmblem } from "./CardParts";

export { EmptyState, type EmptyStateProps } from "./EmptyState";

export {
  VerifiedBadge,
  type VerifiedBadgeProps,
  type VerifiedBadgeSize,
} from "./VerifiedBadge";

export { Eyebrow, type EyebrowProps, type EyebrowAs } from "./Eyebrow";
