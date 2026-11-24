import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card, Section } from "@/components/ui";
import { getAccountRole } from "@/lib/account";
import { requireUser } from "@/lib/auth";
import { tServer } from "@/lib/i18n-server";
import { privateMeetupVenues } from "@/lib/meetup-data";
import { meetupPhase, type Meetup } from "@/lib/meetups";
import { canHostMeetup } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { nowISO } from "@/lib/time";
import { updateHostedMeetupAction } from "../../actions";
import { HostMeetupWizard } from "../../HostMeetupWizard";

export default async function EditHostedMeetupPage({ params }: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await requireUser();
  const supabase = await createClient();
  if (!canHostMeetup(await getAccountRole(supabase, user.id))) notFound();

  const { data } = await supabase
    .from("meetups")
    .select("id, category, topic, format, starts_at, ends_at, lat, lng, location, online_url, visibility, title, description, capacity, image_url, status")
    .eq("slug", slug)
    .eq("created_by", user.id)
    .maybeSingle();
  if (!data) notFound();
  if (data.status !== "published" || meetupPhase(data, Date.parse(nowISO())) !== "upcoming") {
    redirect(`/meetups/${slug}`);
  }

  const initial = data as Pick<Meetup, keyof typeof data>;
  const venues = await privateMeetupVenues(supabase, initial.visibility === "private" ? [initial.id] : []);

  return (
    <Section width="narrow">
      <Link
        href={`/meetups/${slug}`}
        className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> {await tServer("Back to meetup")}
      </Link>
      <h1 className="mb-6 text-d2">{await tServer("Edit meetup")}</h1>
      <Card padding="none">
        <HostMeetupWizard
          initial={{ ...initial, ...venues.get(initial.id) }}
          action={updateHostedMeetupAction.bind(null, initial.id)}
        />
      </Card>
    </Section>
  );
}
