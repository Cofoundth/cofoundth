// Host a meetup — founder-facing, and ONLY founder-facing. Neither of the
// other two roles reaches this page in normal use (middleware excludes
// /meetups/new for both, via the per-role allowlists in lib/roles.ts, same as
// /community/new), and hostMeetupAction re-checks server-side; the guard below
// is the belt to that suspenders, because the middleware does not see a
// server action and a route gate is not a write boundary.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { tServer } from "@/lib/i18n-server";
import { getAccountRole } from "@/lib/account";
import { canHostMeetup } from "@/lib/roles";
import { Card, Section } from "@/components/ui";
import { HostMeetupWizard } from "../HostMeetupWizard";

export const dynamic = "force-dynamic";

export default async function NewMeetupPage() {
  const user = await requireUser();
  const supabase = await createClient();
  // Founder only: an explorer may RSVP to a meetup but not open one, so they
  // are bounced here exactly like an investor.
  if (!canHostMeetup(await getAccountRole(supabase, user.id)))
    redirect("/meetups");

  return (
    <Section width="narrow">
      <div className="mb-8">
        <h1 className="text-d2">{await tServer("Host a meetup")}</h1>
      </div>

      {/* The wizard owns its own per-step subline and its own padding — the
          page contributes only the h1 and the surface. */}
      <Card padding="none">
        <HostMeetupWizard />
      </Card>
    </Section>
  );
}
