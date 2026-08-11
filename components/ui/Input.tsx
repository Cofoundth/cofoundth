// Cofoundee — canonical text field primitives (Input + Textarea). CLIENT-SAFE.
//
// NO "use client" directive: no hooks, no state, so these render from server
// components (uncontrolled form fields) and client components alike. Nothing
// here is translated — pass already-translated `label` / `placeholder` /
// `error` strings, the way every form in the app already does.
//
// ── THE CANONICAL FIELD ───────────────────────────────────────────────────
// Copied verbatim from the ~40 hand-written fields, which ship at exactly two
// sizes:
//
//   fieldSize   padding            text       real sites
//   md          px-4 py-3          (inherit)    43  DEFAULT: forms, onboarding, auth
//   sm          px-3 py-2          text-sm      10  dense rows, inline replies, admin
//
// Shared on both: `w-full border border-line bg-white text-ink
// focus:outline-none focus:border-navy`. The `focus:outline-none` is safe —
// globals.css re-adds a navy `:focus-visible` ring with `!important`, so
// keyboard users keep a focus ring while mouse users don't.
//
// The label is the app's 39-site idiom: `block text-xs uppercase
// tracking-[0.15em] text-ink-muted mb-2`. When a `hint` is supplied (the
// character counters used by the composers) the label + hint share a
// `flex items-center justify-between mb-2` row and the label drops its own
// margin — again matching the existing markup exactly.
//
// ── ACCESSIBLE NAME IS ENFORCED BY THE TYPES ──────────────────────────────
// `FieldA11y` is a union, so TypeScript rejects a nameless field. Exactly one
// of these must be satisfied:
//   1. `label` + `id`     → renders a real <label htmlFor>. Prefer this.
//   2. `aria-label`       → for fields whose visible label is elsewhere.
//   3. `aria-labelledby`  → for fields named by existing visible text.
//
// SHARP CORNERS ALWAYS — never add a rounded-* utility here.

import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

export type FieldSize = "sm" | "md";

// Note the border COLOUR is applied separately below, not here: two competing
// `border-*` colour utilities in one class attribute do not resolve by the
// order they are written (CSS source order decides), so the error state must
// REPLACE `border-line` rather than be appended after it. For a field with no
// error this still emits exactly `border border-line` — identical output to
// the ~40 hand-written fields.
const FIELD_BASE =
  "w-full border bg-white text-ink focus:outline-none focus:border-navy";

const FIELD_SIZE_CLASSES: Record<FieldSize, string> = {
  sm: "px-3 py-2 text-sm",
  md: "px-4 py-3",
};

const LABEL_CLASSES = "block text-xs uppercase tracking-[0.15em] text-ink-muted";

export type ResizeMode = "none" | "y" | "both";

const RESIZE_CLASSES: Record<ResizeMode, string> = {
  none: "resize-none",
  y: "resize-y",
  both: "",
};

// One of: a visible label (with the id it points at), an aria-label, or an
// aria-labelledby. A field with none of them is a type error.
type FieldA11y =
  | { label: string; id: string }
  | { label?: undefined; "aria-label": string }
  | { label?: undefined; "aria-labelledby": string };

type FieldOwnProps = {
  label?: string;
  /** Right-hand slot on the label row — the character counters, "Forgot?", etc. */
  hint?: ReactNode;
  /** Field-level error message. Also sets aria-invalid + aria-describedby. */
  error?: string;
  fieldSize?: FieldSize;
  /** Classes for the wrapper <div>, e.g. layout margins. */
  containerClassName?: string;
};

function FieldShell({
  label,
  hint,
  error,
  htmlFor,
  containerClassName,
  children,
}: {
  label?: string;
  hint?: ReactNode;
  error?: string;
  htmlFor?: string;
  containerClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className={containerClassName}>
      {label &&
        (hint ? (
          <div className="flex items-center justify-between mb-2">
            <label htmlFor={htmlFor} className={LABEL_CLASSES}>
              {label}
            </label>
            {hint}
          </div>
        ) : (
          <label htmlFor={htmlFor} className={cn(LABEL_CLASSES, "mb-2")}>
            {label}
          </label>
        ))}
      {!label && hint && (
        <div className="flex items-center justify-end mb-2">{hint}</div>
      )}
      {children}
      {error && (
        <p
          id={htmlFor ? `${htmlFor}-error` : undefined}
          className="mt-1.5 text-xs text-red-800"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export type InputProps = ComponentProps<"input"> & FieldOwnProps & FieldA11y;

export function Input(props: InputProps) {
  const {
    label,
    hint,
    error,
    fieldSize = "md",
    containerClassName,
    className,
    ...rest
  } = props as ComponentProps<"input"> & FieldOwnProps;

  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      htmlFor={rest.id}
      containerClassName={containerClassName}
    >
      <input
        {...rest}
        aria-invalid={error ? true : rest["aria-invalid"]}
        aria-describedby={
          error && rest.id ? `${rest.id}-error` : rest["aria-describedby"]
        }
        className={cn(
          FIELD_BASE,
          FIELD_SIZE_CLASSES[fieldSize],
          error ? "border-red-300" : "border-line",
          className,
        )}
      />
    </FieldShell>
  );
}

export type TextareaProps = ComponentProps<"textarea"> &
  FieldOwnProps &
  FieldA11y & {
    /** `none` (8 sites) is the app default; the composers use `y` (5 sites). */
    resize?: ResizeMode;
  };

export function Textarea(props: TextareaProps) {
  const {
    label,
    hint,
    error,
    fieldSize = "md",
    resize = "none",
    containerClassName,
    className,
    ...rest
  } = props as ComponentProps<"textarea"> &
    FieldOwnProps & { resize?: ResizeMode };

  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      htmlFor={rest.id}
      containerClassName={containerClassName}
    >
      <textarea
        {...rest}
        aria-invalid={error ? true : rest["aria-invalid"]}
        aria-describedby={
          error && rest.id ? `${rest.id}-error` : rest["aria-describedby"]
        }
        className={cn(
          FIELD_BASE,
          FIELD_SIZE_CLASSES[fieldSize],
          RESIZE_CLASSES[resize],
          error ? "border-red-300" : "border-line",
          className,
        )}
      />
    </FieldShell>
  );
}
