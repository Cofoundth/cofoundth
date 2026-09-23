// Cofoundee — shared UI primitives barrel.
//
// Import from "@/components/ui" rather than the individual files.
//
// Almost every primitive here is CLIENT-SAFE and carries NO "use client"
// directive: they use no hooks or state, so they render from server components
// and client components alike. The TWO exceptions are `Dialog` and `Tabs`,
// which need the DOM (focus trap, scroll lock) and an event handler; they are
// ordinary client components, so a server page can still render them — their
// props are all serialisable.
//
// NONE of them translate internally — they take already-translated strings as
// props (`label`, `title`, `description`, children), so a server page can pass
// `await tServer("…")` and a client component can pass `tr("…")` from useT().
// Do not add useT() to these files; it would force "use client" and lock the
// server-safe ones out of server pages.

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

export {
  Card,
  cardClasses,
  type CardProps,
  type CardPadding,
  type CardTone,
  type CardAs,
} from "./Card";

export {
  Dialog,
  type DialogProps,
  type DialogSize,
  type DialogPadding,
  type DialogSurface,
} from "./Dialog";

export { Tabs, type TabsProps, type TabItem, type TabsDensity } from "./Tabs";

export {
  SectionHeading,
  type SectionHeadingProps,
  type SectionHeadingTone,
} from "./SectionHeading";

export {
  ToggleChip,
  type ToggleChipProps,
  type ToggleChipSize,
} from "./ToggleChip";

export { CountBadge, type CountBadgeProps } from "./CountBadge";

export {
  CardLabel,
  CardChip,
  CardPill,
  SectorList,
  StageEmblem,
} from "./CardParts";

export {
  EmptyState,
  type EmptyStateProps,
  type EmptyStateTone,
  type EmptyStateAlign,
} from "./EmptyState";

export {
  VerifiedBadge,
  type VerifiedBadgeProps,
  type VerifiedBadgeSize,
} from "./VerifiedBadge";

export { Eyebrow, type EyebrowProps, type EyebrowAs } from "./Eyebrow";
