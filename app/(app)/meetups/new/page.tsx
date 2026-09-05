// Host a meetup — founder-facing. Investors never reach this page (middleware
// excludes /meetups/new via lib/investor-routes.ts, same as /community/new),
// and hostMeetupAction re-checks server-side; the layout guard here is the
// belt to that suspenders.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { tServer } from "@/lib/i18n-server";
import { isInvestorAccount } from "@/lib/account";
import { Card, Section } from "@/components/ui";
import { HostMeetupWizard } from "../HostMeetupWizard";

export const dynamic = "force-dynamic";

export default async function NewMeetupPage() {
  const user = await requireUser();
  const supabase = await createClient();
  if (await isInvestorAccount(supabase, user.id)) redirect("/meetups");

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
