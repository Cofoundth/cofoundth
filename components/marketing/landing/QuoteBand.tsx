import { Quote } from "lucide-react";
import { t, type Locale } from "@/lib/i18n";

/**
 * Full-bleed social-proof band (Onfound's `.spb`).
 *
 * We have ~1 real user and a standing rule against fabricated testimonials,
 * so the band keeps their SHAPE and carries the founder's own note instead.
 * Strings are copied verbatim from the previous inline section so the existing
 * Thai translations keep resolving.
 *
 * On navy the usual "gold is never a foreground" rule inverts: #E9E2D4 is a
 * warm off-white here, and this is the one place it belongs as text.
 */
export function QuoteBand({ locale }: { locale: Locale }) {
  const tr = (en: string) => t(en, locale);

  return (
    <section
      aria-labelledby="founder-note-heading"
      className="py-[88px] bg-navy text-white"
    >
      <div className="max-w-3xl mx-auto px-6 lg:px-10">
        <Quote className="w-10 h-10 text-gold mb-8" strokeWidth={1} aria-hidden="true" />

        <h2
          id="founder-note-heading"
          className="text-xs uppercase tracking-[0.25em] text-gold mb-8"
        >
          {tr("A note from the founder")}
        </h2>

        <figure>
          <blockquote className="font-serif text-d1 lg:text-d2 leading-relaxed space-y-6">
            <p>
              {tr(
                "Building a startup is easier than ever — AI, less capital, two or three people can start. The hard part now is finding the right people to build it with.",
              )}
            </p>
            <p>
              {tr(
                "My own circle all has similar skills, so we lack the same things. The person who fills your gaps usually isn't in it.",
              )}
            </p>
            <p>
              {tr(
                "So I wanted a place where people who want to build something can find each other. That's where Cofoundee came from.",
              )}
            </p>
          </blockquote>

          <figcaption className="mt-8 text-sm tracking-wide text-white/70">
            — Chayanon, {tr("founder of Cofoundee")}
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
