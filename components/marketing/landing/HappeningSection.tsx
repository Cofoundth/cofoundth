import Link from "next/link";
import { ArrowUpRight, Link2, Rocket, Trophy } from "lucide-react";
import { t, type Locale } from "@/lib/i18n";
import { timeAgo } from "@/lib/time";
import { Avatar } from "@/components/Avatar";

export type HappeningItem = {
  id: string;
  authorName: string;
  content: string;
  kind: string; // "milestone" | "show_and_tell"
  imageUrl: string | null;
  linkUrl: string | null;
  createdAt: string; // ISO
};

// Same two kinds the public post page labels, same icons — keep them in sync.
const KIND: Record<string, { Icon: typeof Trophy; label: string }> = {
  milestone: { Icon: Trophy, label: "Milestone" },
  show_and_tell: { Icon: Rocket, label: "Show & tell" },
};

export function HappeningSection({
  items,
  locale,
}: {
  items: HappeningItem[];
  locale: Locale;
}) {
  // An empty "what's happening" grid reads worse than no section at all on a
  // young community — render nothing rather than a placeholder.
  if (items.length === 0) return null;

  const tr = (en: string) => t(en, locale);

  return (
    <section className="py-[100px]">
      <div className="max-w-[1120px] mx-auto px-6 lg:px-10">
        <div className="max-w-[640px] mb-12">
          <div className="text-xs uppercase tracking-[0.25em] text-gold-ink mb-6">
            {tr("Happening now")}
          </div>
          <h2 className="text-d2 lg:text-d3 mb-4">
            {tr("What founders here are shipping.")}
          </h2>
          <p className="text-base text-ink-muted leading-relaxed">
            {tr(
              "Real milestones and launches posted by real people in the community — not a curated highlight reel.",
            )}
          </p>
        </div>

        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const kind = KIND[item.kind];
            return (
              <li key={item.id} className="h-full">
                <Link
                  href={`/p/${item.id}`}
                  className="group rounded-[22px] border border-line bg-white p-6 flex flex-col h-full transition-colors hover:border-navy/25"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar name={item.authorName} size="sm" />
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium text-ink truncate">
                        {item.authorName}
                      </h3>
                      <div className="text-xs text-ink-muted">
                        {timeAgo(item.createdAt, locale)}
                      </div>
                    </div>
                  </div>

                  {item.imageUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="w-full h-36 object-cover rounded-xl border border-line mb-4"
                    />
                  )}

                  <p className="text-sm text-ink-muted leading-relaxed line-clamp-4 whitespace-pre-wrap">
                    {item.content}
                  </p>

                  <div className="mt-auto pt-5 border-t border-line flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-xs text-gold-ink">
                      {kind && (
                        <kind.Icon
                          className="w-3.5 h-3.5"
                          strokeWidth={1.5}
                          aria-hidden="true"
                        />
                      )}
                      {kind ? tr(kind.label) : tr("Update")}
                      {item.linkUrl && (
                        <>
                          <Link2
                            className="w-3.5 h-3.5 ml-1"
                            strokeWidth={1.5}
                            aria-hidden="true"
                          />
                          {/* the icon is the only "has a link" cue — name it */}
                          <span className="sr-only">
                            {tr("Includes a link")}
                          </span>
                        </>
                      )}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-navy">
                      {tr("Read post")}
                      <ArrowUpRight
                        className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
