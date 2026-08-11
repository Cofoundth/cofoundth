// Cofoundee — tiny className joiner used by the components/ui primitives.
// CLIENT-SAFE. Deliberately not `clsx`: the primitives only ever need to drop
// falsy slots and collapse whitespace, and adding a dependency for that would
// be noise. Later classes win only because Tailwind emits one utility per
// class — this does NOT de-duplicate conflicting utilities, so when a caller
// overrides a padding they should pass the whole padding.

export function cn(
  ...parts: Array<string | false | null | undefined>
): string {
  return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}
