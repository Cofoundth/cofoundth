import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/admin";
import { isUuid } from "@/lib/slug";
import type { Meetup } from "@/lib/meetups";
import { MeetupForm } from "../../MeetupForm";
import { MeetupDangerZone } from "../../MeetupDangerZone";
import { updateMeetupAction } from "../../actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditMeetupPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!(await isAdminUser(supabase, user))) notFound();
  if (!isUuid(id)) notFound();

  const admin = createAdminClient();
  const { data } = await admin
    .from("meetups")
    .select(
      "id, slug, title, description, format, location, online_url, starts_at, ends_at, capacity, status, created_by, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const meetup = data as Meetup;

  return (
    <div className="max-w-[640px] mx-auto px-6 lg:px-10 py-10">
      <Link
        href="/admin/meetups"
        className="text-sm text-ink-muted hover:text-navy mb-8 inline-flex items-center gap-1.5"
      >
        <ArrowLeft className="w-4 h-4" /> All meetups
      </Link>

      <div className="mb-8 pb-8 border-b border-line flex items-end justify-between gap-4">
        <div>
          <h1 className="text-d2">Edit meetup</h1>
        </div>
        {meetup.status !== "draft" && (
          <Link
            href={`/meetups/${meetup.slug}`}
            className="text-sm text-ink-muted hover:text-navy inline-flex items-center gap-1.5 shrink-0"
          >
            View <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      <MeetupForm
        initial={meetup}
        action={updateMeetupAction.bind(null, meetup.id)}
        submitLabel="Save changes"
      />

      <MeetupDangerZone id={meetup.id} status={meetup.status} />
    </div>
  );
}
