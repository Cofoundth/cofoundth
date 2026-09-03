import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
import { MeetupForm } from "../MeetupForm";
import { createMeetupAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewMeetupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!(await isAdminUser(supabase, user))) notFound();

  return (
    <div className="max-w-[640px] mx-auto px-6 lg:px-10 py-10">
      <Link
        href="/admin/meetups"
        className="text-sm text-ink-muted hover:text-navy mb-8 inline-flex items-center gap-1.5"
      >
        <ArrowLeft className="w-4 h-4" /> All meetups
      </Link>

      <div className="mb-8">
        <h1 className="text-d2">New meetup</h1>
      </div>

      <MeetupForm action={createMeetupAction} submitLabel="Create meetup" />
    </div>
  );
}
