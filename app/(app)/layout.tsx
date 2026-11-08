import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { IncompleteProfileBanner } from "@/components/IncompleteProfileBanner";
import { canRoleRead, parseAccountRole, roleHome } from "@/lib/roles";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded, profile_complete, account_type")
    .eq("id", user.id)
    .single();

  const pathname = (await headers()).get("x-pathname") ?? "";

  // Conversation views are full-height by design: they own the viewport and
  // scroll internally. A marketing-style footer underneath just adds a strip of
  // page scroll below a pane that is already exactly one screen tall, so these
  // routes drop it and take the full height instead.
  const isConversation =
    pathname.startsWith("/messages/") || pathname.endsWith("/chat");

  // Which role this account is, and where a blocked member of it gets sent.
  // `home === null` means the role is ungated — i.e. founder, the unrestricted
  // default. lib/roles.ts owns both answers; nothing here compares
  // account_type to a string.
  //
  // Explorers read the maker shelf, the feed and meetups and bounce to
  // /products; investors read the funding surface and bounce to /funding.
  // Writes are blocked separately, inside the server actions — a route gate is
  // not a write gate.
  const role = parseAccountRole(profile?.account_type);
  const home = roleHome(role);

  if (home !== null) {
    // Defence in depth only — the REAL gate is proxy.ts. A layout redirect does
    // not fire on client-side navigation, because Next does not re-render a
    // shared layout between sibling routes. Same allowlists, one definition, so
    // the two cannot drift apart.
    if (!canRoleRead(role, pathname)) redirect(home);
  } else if (!profile?.onboarded) {
    // New FOUNDERS must finish their profile before using the app. This arm is
    // reachable only when home === null, which is the founder branch — so it
    // can never fire for a gated role.
    //
    // That shape is deliberate, not incidental. An explorer never onboards:
    // handle_new_user leaves `onboarded` false forever for them, so the old
    // `else if (!profile?.onboarded)` hanging off an is-investor test sent an
    // explorer to /onboarding from EVERY app route — /products included, the one
    // surface the role exists for — and then handed them the founder wizard.
    // Writing this as `role !== "explorer" && !onboarded` would re-open exactly
    // that trap for the next role added.
    redirect("/onboarding");
  }

  // Gates above, chrome below. The chrome is shared with signed-in marketing
  // routes (app/(marketing)/layout.tsx) through AppShell; the gates are not.
  return (
    <AppShell
      footer={!isConversation}
      banner={
        <IncompleteProfileBanner
          // The nag is a FOUNDER concern: profile_complete (migration 0046) is
          // the founder-directory gate, and the banner's own copy says "other
          // founders can't find your profile". A gated role has no founder
          // profile to complete — an explorer's profile_complete is false
          // permanently, so the old `isInvestor || …` shape pinned a navy
          // "Action needed" panel to the top of every page an explorer visited,
          // nagging them toward the onboarding the role is defined by skipping.
          // Keyed off `home` rather than a list of role names so the next role
          // does not need a third disjunct remembered here.
          complete={home !== null || !!profile?.profile_complete}
        />
      }
    >
      {children}
    </AppShell>
  );
}
