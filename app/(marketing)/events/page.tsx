import Link from "next/link";
import { Calendar, MapPin } from "lucide-react";
import { Section } from "@/components/ui";

type Event = {
  title: string;
  date: string;
  location: string;
  description: string;
  status: "upcoming" | "past";
};

const EVENTS: Event[] = [
  {
    title: "Cofoundee Launch Mixer",
    date: "2026-06-15T18:30:00+07:00",
    location: "Bangkok ·To be announced",
    description:
      "Our first in-person mixer for founders looking for co-founders. Intimate setting, structured intros, vetted attendees.",
    status: "upcoming",
  },
  {
    title: "Founder Office Hours",
    date: "2026-06-22T19:00:00+07:00",
    location: "Online ·Zoom",
    description:
      "Weekly online drop-in with founders from the community. Bring your hardest question.",
    status: "upcoming",
  },
  {
    title: "Pitch Night — FinTech focus",
    date: "2026-07-10T19:00:00+07:00",
    location: "Bangkok ·Venue TBD",
    description:
      "Five Thai FinTech founders pitch their ventures. Investors and operators in the audience.",
    status: "upcoming",
  },
];

export default function EventsPage() {
  return (
    <Section>
      <div className="mb-8 max-w-[640px]">
        <div className="text-xs uppercase tracking-[0.25em] text-gold-ink mb-6">
          Community
        </div>
        <h1 className="text-d2 lg:text-d3 mb-4">Events</h1>
        <p className="text-lg text-ink leading-relaxed">
          In-person and online gatherings for Thailand&rsquo;s founder
          community.
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
              <div className="md:w-32 shrink-0">
                <div className="font-serif text-num2 text-gold-ink">
                  {d.toLocaleDateString("en-GB", { day: "numeric" })}
                </div>
                <div className="text-xs uppercase tracking-[0.2em] text-ink-muted mt-1">
                  {d.toLocaleDateString("en-GB", {
                    month: "short",
                    year: "numeric",
                  })}
                </div>
                <div className="text-xs text-ink-muted mt-1">
                  {d.toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl mb-2">
                  {e.title}
                </h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted mb-3">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {d.toLocaleDateString("en-GB", {
                      weekday: "long",
                    })}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {e.location}
                  </span>
                </div>
                <p className="text-sm text-ink leading-relaxed mb-4">
                  {e.description}
                </p>
                <button
                  type="button"
                  disabled
                  className="text-sm text-ink-muted inline-flex items-center gap-1.5 cursor-not-allowed"
                  title="RSVP opens closer to event"
                >
                  RSVP ·opens closer to event
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-16 p-6 bg-cream border border-line rounded-xl">
        <h3 className="text-xl mb-2">
          Want to host an event?
        </h3>
        <p className="text-sm text-ink leading-relaxed mb-3">
          We&rsquo;re always looking for partners to host pitch nights, panel
          discussions, and casual mixers across Thailand.
        </p>
        <Link
          href="/signup"
          className="text-sm text-navy hover:text-gold-ink inline-flex items-center gap-1.5"
        >
          Join Cofoundee to propose an event &rarr;
        </Link>
      </div>
    </Section>
  );
}
