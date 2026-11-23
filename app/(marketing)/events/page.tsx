import Link from "next/link";
import { Calendar, MapPin } from "lucide-react";
import { Section } from "@/components/ui";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

type Event = {
  title: string;
  date: string;
  location: string;
  description: string;
};

const EVENT_TIME_ZONE = "Asia/Bangkok";

const EVENTS: Event[] = [
  {
    title: "Cofoundee Launch Mixer",
    date: "2026-06-15T18:30:00+07:00",
    location: "Bangkok · To be announced",
    description:
      "Our first in-person mixer for founders looking for co-founders. Intimate setting, structured intros, vetted attendees.",
  },
  {
    title: "Founder Office Hours",
    date: "2026-06-22T19:00:00+07:00",
    location: "Online · Zoom",
    description:
      "Weekly online drop-in with founders from the community. Bring your hardest question.",
  },
  {
    title: "Pitch Night — FinTech focus",
    date: "2026-07-10T19:00:00+07:00",
    location: "Bangkok · Venue TBD",
    description:
      "Five Thai FinTech founders pitch their ventures. Investors and operators in the audience.",
  },
];

export default async function EventsPage() {
  const locale = await getLocale();
  const tr = (en: string) => t(en, locale);
  const now = new Date();

  return (
    <Section rhythm="marketing">
      <div className="mb-8 max-w-[640px]">
        {/* Hidden inside the app shell — see insights/page.tsx. */}
        <div className="text-xs uppercase tracking-[0.25em] text-gold-ink mb-6 in-data-[shell=public]:hidden">
          {tr("Community")}
        </div>
        <h1 className="text-d2 lg:text-d3 mb-4">{tr("Events")}</h1>
        <p className="text-lg text-ink leading-relaxed">
          {tr("In-person and online gatherings for Thailand’s founder community.")}
        </p>
      </div>

      <div className="space-y-4">
        {EVENTS.map((e) => {
          const d = new Date(e.date);
          return (
            <div
              key={e.title}
              className="bg-white border border-line p-6 lg:p-8 flex flex-col md:flex-row gap-6 rounded-xl"
            >
              <time dateTime={e.date} className="md:w-32 shrink-0">
                <span className="block font-serif text-num2 text-gold-ink">
                  {d.toLocaleDateString("en-GB", { day: "numeric", timeZone: EVENT_TIME_ZONE })}
                </span>
                <span className="block text-xs uppercase tracking-[0.2em] text-ink-muted mt-1">
                  {d.toLocaleDateString("en-GB", {
                    month: "short",
                    year: "numeric",
                    timeZone: EVENT_TIME_ZONE,
                  })}
                </span>
                <span className="block text-xs text-ink-muted mt-1">
                  {d.toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: EVENT_TIME_ZONE,
                  })}
                </span>
              </time>
              <div className="flex-1">
                <h2 className="text-xl mb-2">
                  {e.title}
                </h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted mb-3">
                  <span className="inline-flex items-center gap-1">
                    <Calendar aria-hidden className="w-3 h-3" />
                    {d.toLocaleDateString("en-GB", {
                      weekday: "long",
                      timeZone: EVENT_TIME_ZONE,
                    })}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin aria-hidden className="w-3 h-3" />
                    {tr(e.location)}
                  </span>
                </div>
                <p className="text-sm text-ink leading-relaxed mb-4">
                  {tr(e.description)}
                </p>
                <span className="inline-flex rounded-full bg-cream px-2.5 py-1 text-xs text-ink-muted">
                  {tr(d < now ? "Past event" : "Upcoming")}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* A signup pitch — meaningless to a member, so hidden in the app shell. */}
      <div className="mt-16 p-6 bg-cream border border-line rounded-xl in-data-[shell=public]:hidden">
        <h2 className="text-xl mb-2">{tr("Want to host an event?")}</h2>
        <p className="text-sm text-ink leading-relaxed mb-3">
          {tr("We’re always looking for partners to host pitch nights, panel discussions, and casual mixers across Thailand.")}
        </p>
        <Link
          href="/signup"
          className="text-sm text-navy hover:text-gold-ink inline-flex items-center gap-1.5"
        >
          {tr("Join Cofoundee to propose an event")} &rarr;
        </Link>
      </div>
    </Section>
  );
}
