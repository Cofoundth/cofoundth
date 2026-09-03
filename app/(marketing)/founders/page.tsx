// Public founder directory — a deliberately LIMITED preview for logged-out
// visitors. Every field on this page comes from lib/public-profile.ts, which
// owns the privacy allowlist; nothing else here may query `profiles`.
//
// noindex on purpose: real people's names must not become search results
// without their consent.

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPin, Rocket, Users } from "lucide-react";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { ROLE_LABELS, STAGE_LABELS } from "@/lib/matching";
import { provinceLabel } from "@/lib/provinces";
import { listPublicFounders } from "@/lib/public-profile";
import { Avatar } from "@/components/Avatar";
import {
  Card,
  CardChip,
  CardLabel,
  EmptyState,
  Eyebrow,
  LinkButton,
  Section,
  SectorList,
  StageEmblem,
  VerifiedBadge,
} from "@/components/ui";

export const metadata: Metadata = {
  title: "Founders",
  description:
    "A preview of the founder community on Cofoundee — Thailand's startup ecosystem.",
  robots: { index: false, follow: false },
};

export default async function PublicFoundersPage() {
  const locale = await getLocale();
  const tr = (en: string) => t(en, locale);
  const founders = await listPublicFounders(48);
  const verifiedLabel = tr("Verified");

  return (
    <Section rhythm="marketing">
      {/* Header */}
      <div className="max-w-[640px] mb-8">
        <Eyebrow className="mb-6">{tr("Community")}</Eyebrow>
        <h1 className="text-d2 lg:text-d3 mb-4">
          {tr("Founders")}
        </h1>
        <p className="text-lg text-ink leading-relaxed">
          {tr(
            "A preview of the founders building in Thailand. Join free to see full profiles and connect.",
          )}
        </p>
      </div>

      {/* Thin gold rule — the editorial section divider used across the site. */}
      <div className="w-16 h-px bg-line mb-12" />

      {founders.length === 0 ? (
        // An unfiltered list, so this is genuinely "nobody here yet" rather than
        // "your filter matched nothing" — which makes "be the first" the honest
        // ask. It does not render today (the directory has real people in it),
        // but it is the first thing a visitor would see if it ever did.
        <EmptyState
          icon={Users}
          title={tr("No founders yet")}
          description={tr(
            "This is where founders building in Thailand show up. Create your profile and be the first.",
          )}
          action={
            <LinkButton href="/signup" size="lg">
              {tr("Join the community")}
            </LinkButton>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {founders.map((f) => {
            const roles = f.roles
              .map((r) => (ROLE_LABELS[r] ? tr(ROLE_LABELS[r]) : null))
              .filter(Boolean) as string[];
            const stageLabel = f.stage ? STAGE_LABELS[f.stage] : null;
            return (
              <Link
                key={f.slug}
                href={`/founders/${f.slug}`}
                // min-w-0: a grid item defaults to min-width:auto, so
                // without it the card refuses to shrink below its content
                // and overflows the track on a phone (1157px in 342px).
                className="group block h-full min-w-0"
              >
                <Card hoverable padding="xs" className="h-full flex flex-col">
                  {/* HEADER — 48px: avatar beside a name/meta column, and
                      nothing below it indented past the avatar. */}
                  <div className="shrink-0 flex gap-3 items-center">
                    <Avatar name={f.fullName} url={f.photoUrl} size="md" />
                    <div className="flex flex-col justify-center min-w-0 flex-1 overflow-hidden">
                      <h2 className="flex items-center gap-1.5 text-sm font-semibold leading-none group-hover:text-gold-ink transition-colors">
                        <span className="truncate">{f.fullName}</span>
                        {f.verified && <VerifiedBadge label={verifiedLabel} />}
                      </h2>
                      {f.location && (
                        <div className="mt-1.5 flex items-center gap-1 text-xs text-ink-muted overflow-hidden">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">
                            {provinceLabel(f.location, locale)}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Stage as a glyph in the corner, the way Onfound mark it.
                        As an inline pill it cost up to 97px of the row below —
                        "กำลังสร้าง MVP" is a long string — and that row is the
                        only place industries can go. */}
                    <StageEmblem
                      stage={f.stage}
                      label={stageLabel ? tr(stageLabel) : ""}
                    />
                  </div>

                  {/* BODY — three rows on a 10px rhythm, each full card width. */}
                  <div className="mt-4 flex flex-col gap-4 flex-1 min-h-0">
                    {/* Industries as plain text, not chips: a chip's padding
                        and border cost ~20px each, so one chip filled the row
                        that two or three bare names fit in. With stage moved to
                        the corner this row is theirs alone — it went from ~183px
                        to the full card width. */}
                    {/* Always rendered, at a reserved height. Omitting it on
                        the one founder with no industries pulled every row
                        below it up 32px and broke the shared skeleton. */}
                    {/* h-[21px], not h-4: /browse's equivalent row carries an intent pill
                        at 21px, and matching it here puts both directories' blocks on
                        the same y (80/117/194) instead of 5px apart. */}
                    <div className="flex h-[21px] items-center overflow-hidden">
                      <SectorList
                        items={f.industry}
                        fallback={stageLabel ? tr(stageLabel) : undefined}
                      />
                    </div>

                    {f.excerpt && (
                      <div className="flex flex-col gap-1.5 min-w-0">
                        <CardLabel icon={Rocket}>{tr("Working on")}</CardLabel>
                        <p className="text-xs leading-relaxed line-clamp-2 text-ink-muted min-h-[39px]">
                          {f.excerpt}
                        </p>
                      </div>
                    )}

                    {roles.length > 0 && (
                      <div className="mt-auto flex flex-col gap-1.5 min-w-0">
                        <CardLabel icon={Users}>{tr("Role")}</CardLabel>
                        <div className="flex flex-row gap-1.5 overflow-hidden h-[22px]">
                          {roles.slice(0, 3).map((r) => (
                            <CardChip key={r}>{r}</CardChip>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Conversion — the whole point of the preview. */}
      <div className="mt-16 bg-navy text-white p-10 lg:p-12 text-center rounded-xl">
        <h2 className="text-d2 lg:text-d3 text-white mb-4">
          {tr("Where Thai founders connect")}
        </h2>
        <p className="text-white/70 leading-relaxed max-w-xl mx-auto mb-8">
          {tr(
            "Community, partners, and co-founders — in one place. Free to join.",
          )}
        </p>
        {/* Inverted CTA — the app's white-on-navy band idiom. Not <LinkButton>:
            cn() does not de-duplicate Tailwind utilities, so overriding its
            bg-navy with bg-white would be a coin flip on stylesheet order. */}
        <Link
          href="/signup"
          className="inline-flex items-center justify-center gap-2 bg-white text-navy hover:bg-cream px-8 py-4 text-sm tracking-wide transition-colors rounded-full"
        >
          {tr("Sign up to connect")}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </Section>
  );
}
