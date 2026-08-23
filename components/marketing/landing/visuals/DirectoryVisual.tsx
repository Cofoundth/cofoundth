import { t, type Locale } from "@/lib/i18n";

/**
 * Decorative abstraction of the Founder directory, for the `.fv` panel next to
 * the COMMUNITY feature block. Onfound ships a product screenshot here; we have
 * none, so this is composed from the same primitives the real UI uses.
 *
 * Everything is invented placeholder content — never real member data — and the
 * whole panel is aria-hidden so assistive tech doesn't read fake people as real
 * content. No links, no buttons, no client JS.
 *
 * `locale` is optional so the orchestrator can call `<DirectoryVisual />`, but
 * passing it keeps the visible copy in the reader's language.
 */

// Muted, dark circles in the same register as components/Avatar.tsx
// (hsl(h 38% 30%)) — decorative only, so the values are inlined rather than
// importing the real Avatar.
const ROWS = [
  {
    initials: "PS",
    color: "hsl(214 38% 30%)",
    name: "Ploy S.",
    role: "Technical",
    location: "Bangkok",
    tags: ["Fintech", "Full-time"],
    score: 92,
  },
  {
    initials: "NT",
    color: "hsl(24 38% 30%)",
    name: "Nut T.",
    role: "Business",
    location: "Chiang Mai",
    tags: ["SaaS", "Has an idea"],
    score: null,
  },
  {
    initials: "MA",
    color: "hsl(152 38% 30%)",
    name: "Mint A.",
    role: "Product",
    location: "Bangkok",
    tags: ["Still exploring"],
    score: null,
  },
] as const;

export function DirectoryVisual({ locale = "en" }: { locale?: Locale }) {
  const tr = (en: string) => t(en, locale);

  return (
    <div
      aria-hidden="true"
      className="rounded-[22px] border border-line bg-white p-5 shadow-sm"
    >
      <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-ink">
        {tr("Founder directory")}
      </div>

      <div className="divide-y divide-line">
        {ROWS.map((row) => (
          <div key={row.initials} className="flex items-start gap-3 py-3.5">
            <span
              style={{ backgroundColor: row.color }}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[13px] font-medium text-white"
            >
              {row.initials}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-[14px] font-medium leading-tight text-ink">
                  {row.name}
                </span>
                {row.score !== null && (
                  <span className="rounded-full bg-gold px-2 py-0.5 text-[11px] leading-tight text-ink">
                    {tr("Complement Score")} {row.score}
                  </span>
                )}
              </div>

              <div className="mt-0.5 text-[12px] leading-snug text-ink-muted">
                {tr(row.role)} · {tr(row.location)}
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {row.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-line px-2 py-0.5 text-[11px] leading-tight text-ink-muted"
                  >
                    {tr(tag)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
