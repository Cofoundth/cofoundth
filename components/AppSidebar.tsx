import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { FEATURES } from "@/lib/features";
import { tServer } from "@/lib/i18n-server";
import { signOutAction } from "@/app/(auth)/actions";
import { Avatar } from "@/components/Avatar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { BrandMark, Wordmark } from "@/components/Brand";
import {
  NotificationBell,
  type NotifItem,
} from "@/components/NotificationBell";
import { MobileMenu } from "@/components/MobileMenu";
import { OrgSwitcher } from "@/components/OrgSwitcher";
import { getUserOrgs, getActiveOrgId } from "@/lib/active-org";
import { SidebarNav } from "@/components/SidebarNav";
import { SidebarToggle } from "@/components/SidebarState";
import { LEGAL_LINKS, RAIL_ID, RAIL_TIP } from "@/lib/sidebar";
import { LogOut } from "lucide-react";
import {
  parseAccountRole,
  roleHome,
  landingFor,
  canRoleRead,
  isAppShellRoute,
} from "@/lib/roles";

// App chrome, Onfound-style: a left rail from 768px, a slim top bar below it.
// Mounted through components/AppShell.tsx on EVERY signed-in page,
// public/marketing routes included. Onfound splits chrome (marketing = top nav,
// product = sidebar) because their marketing site is another domain; here it
// is one domain, and two menus meant members bounced between them.
//
// The rail is a 64px icon rail at 768-1279px (its toggle opens the full rail
// as an overlay drawer) and, from 1280px, 256px or 64px per the member's
// cookie — lib/sidebar.ts has the whole map. 768 rather than the old 1024
// because the owner's own laptop renders at ~929 CSS px (Windows display
// scaling), and below 1024 it was getting the phone layout.
export async function AppSidebar() {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, photo_url, slug, is_admin, account_type")
    .eq("id", user.id)
    .single();
  const role = parseAccountRole(profile?.account_type);

  // Where the brand mark goes: the role's landing, the same page a sign-in
  // lands on — the product deck for a founder or an explorer, an investor's own
  // home. There is no dashboard any more (2026-11-12).
  const homeHref = landingFor(role);

  // Founders land on the My Profile hub (identity, stats, account door) —
  // the public view is one row inside it. Investors keep their own home.
  //
  // EXPLORERS KEEP /profile, deliberately, rather than losing this row. The
  // alternative was no link at all, and that strands them: there is no Settings
  // item in any nav array, so this avatar is the ONLY door from the chrome to
  // their own account. /profile is also allowlisted for the role (lib/roles.ts)
  // precisely so a page-level redirect gets a chance to run before the gate
  // fires — the rail's job is only to not point somewhere the gate refuses.
  // What that page SHOWS an explorer (it must not be the founder hub with
  // founder stats and a public-profile link that cannot exist for them) is
  // app/(app)/profile/page.tsx's business, not the rail's.
  const myProfileHref = role === "investor" ? "/investor" : "/profile";

  // "Acting as" company switcher — only meaningful when in >1 company, and it
  // is company chrome, so it hides for the meetups soft launch along with the
  // Companies nav above: a combobox of company names has nothing to point at in
  // a rail with no company surface left in it.
  //
  // The flag gates the READS too, not just the render. These are org_members
  // round-trips on every app page render for every signed-in user, and while
  // the flag is off nothing consumes the result. /orgs keeps working by direct
  // URL regardless — it calls getActiveOrgId itself, which falls back to the
  // earliest-joined org when no cookie has been set.
  const myOrgs = FEATURES.companies ? await getUserOrgs(supabase, user.id) : [];
  const activeOrgId =
    FEATURES.companies && myOrgs.length > 1
      ? await getActiveOrgId(supabase, user.id)
      : null;

  // The Connections badge is founder chrome, and so are its two reads — the
  // same posture as FEATURES.companies gating getUserOrgs above rather than
  // just hiding the switcher. Neither gated role can ever make these counts
  // non-zero: express-interest is founder-only (lib/roles.ts canExpressInterest)
  // and a `matches` row is the only door into /messages, so an explorer or an
  // investor has nothing to be badged about. Skipping them removes two
  // round-trips from EVERY app page render for those accounts.
  const hasConnections = role === "founder";
  const [
    { count: receivedPending },
    { count: unreadMessages },
    { count: unreadNotifs },
    { data: notifRows },
    { count: publishedInsights },
  ] = await Promise.all([
    hasConnections
      ? supabase
          .from("interests")
          .select("id", { count: "exact", head: true })
          .eq("to_profile_id", user.id)
          .eq("status", "pending")
      : Promise.resolve({ count: 0 }),
    // `unsent_at is null` for the same reason /matches filters it: an unsent
    // message has no text left to read, so badging it is a ping for something
    // that no longer exists.
    hasConnections
      ? supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .neq("sender_id", user.id)
          .is("read_at", null)
          .is("unsent_at", null)
      : Promise.resolve({ count: 0 }),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .is("read_at", null),
    supabase
      .from("notifications")
      .select("id, type, entity_id, data, read_at, created_at, actor_id")
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(12),
    // Gates the Insights nav item: a permanent item pointing at an empty
    // "nothing published yet" page would be a dead end. Same predicate as the
    // public list in lib/insights.ts (status = 'published'; RLS also exposes
    // only published rows), head-only so it returns a count and no rows.
    supabase
      .from("insights")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
  ]);

  const actorIds = [
    ...new Set(
      (notifRows ?? [])
        .map((n) => n.actor_id as string | null)
        .filter((x): x is string => Boolean(x)),
    ),
  ];
  const { data: actorRows } = actorIds.length
    ? await supabase
        .from("profiles")
        .select("id, slug, photo_url, full_name")
        .in("id", actorIds)
    : { data: [] as { id: string }[] };
  const actorMap = new Map((actorRows ?? []).map((a) => [a.id as string, a]));
  const notifItems: NotifItem[] = (notifRows ?? []).map((n) => {
    const actor = n.actor_id
      ? ((actorMap.get(n.actor_id as string) as
          | {
              id: string;
              slug: string | null;
              photo_url: string | null;
              full_name: string | null;
            }
          | undefined) ?? null)
      : null;
    return {
      id: n.id as string,
      type: n.type as string,
      entityId: (n.entity_id as string | null) ?? null,
      data:
        (n.data as {
          actor_name?: string;
          post_title?: string;
          slug?: string;
        }) ?? null,
      readAt: (n.read_at as string | null) ?? null,
      createdAt: n.created_at as string,
      actor,
    };
  });

  // Meetups sits directly under Dashboard in the FOUNDER nav: it is the surface
  // the soft launch is about. (A second, horizontal copy of this array used to
  // live in AppHeader and disagreed about where Meetups went — drift, not a
  // decision. That copy is gone; public pages render this rail too.)
  // Investors have no Dashboard, so "below Dashboard" has nothing to mean for
  // them; their order is untouched.
  //
  // Products sits directly under Meetups: both are "go and look at what the
  // community made", and the two launch markers then read as one group rather
  // than two chips scattered down the rail.
  //
  // THREE arrays, one per role — picked below, not derived from each other. An
  // explorer is not "the founder rail minus some items": their rail LEADS with
  // Products, because that is their home, and it carries no Dashboard,
  // Founders, Connections, Companies, Funding or Profile insights at all. Every
  // one of those is a route the gate bounces to /products, and a rail of mostly
  // dead links reads as a broken product rather than a gated one.
  //
  // NAV AND THE ROUTE ALLOWLIST ARE ONE CHANGE, ALWAYS. The Products note in
  // the investor array below is the cautionary tale: a comment here once
  // asserted the middleware covered a route when the route was in neither
  // list, so the role branch never ran on it. A claim about the gate written
  // in a comment is not a gate. The dev-only assertion after these arrays
  // turns that particular claim into something that checks itself.
  //
  // /products is the other half of that lesson, from the opposite direction:
  // it is PUBLIC now (app/(marketing)/products) and out of isAppShellRoute, so
  // there is no allowlist entry left to keep in step and no gate behind the
  // item in ANY of the three arrays. Its presence or absence in a rail is a
  // curation choice from here on — which is exactly why the comment that used
  // to describe it as a gate had to be rewritten rather than left standing.

  // Directly after Community in ALL THREE arrays, and only once something is
  // published. Kept well apart from "Profile insights" (/activity) — different
  // things, and the Thai labels differ too (บทความ vs อินไซต์).
  const insightsItem =
    (publishedInsights ?? 0) > 0
      ? [{ href: "/insights", label: await tServer("Insights") }]
      : [];
  const navItems: {
    href: string;
    label: string;
    badge?: number;
    tag?: string;
  }[] = role === "investor"
    ? [
        { href: "/funding", label: await tServer("Funding") },
        { href: "/community", label: await tServer("Community") },
        ...insightsItem,
        {
          href: "/meetups",
          label: await tServer("Meetups"),
          // Equally new to investors — only the ORDER above is founder-specific.
          ...(FEATURES.meetupsNew ? { tag: await tServer("New") } : {}),
        },
        // Products IS in the investor rail, and that REVERSES the posture
        // this slot used to record. The old note said investors had no
        // Products item because /products was in isAppShellRoute and absent
        // from ROLE_ACCESS.investor, so proxy.ts bounced them to /funding on
        // soft navigation as well as a hard load. BOTH HALVES OF THAT ARE NOW
        // FALSE: the shelf is a PUBLIC marketing route
        // (app/(marketing)/products), it left isAppShellRoute, and the gate
        // short-circuits before the role branch — an investor who types the
        // URL or follows a shared link reads it exactly like an anonymous
        // visitor would, and gets it inside their own rail
        // via app/(marketing)/layout.tsx.
        //
        // So the only question left is NAV CURATION, not enforcement, and
        // hiding a page from one role's rail while the whole internet can read
        // it is not defensible: "what has this community actually built" is
        // closer to an investor's job than anything else on this list. There
        // is no supply-side CTA for them on the page — an investor cannot post
        // a product (canPostProduct) and there is no investor -> founder
        // transition to offer — so the shelf renders read-only for them, which
        // is the investor posture everywhere else too.
        //
        // No "New" chip: the founder rail's marker points at a surface that is
        // news to a maker. Next to Companies because both are "go and look at
        // what else is here".
        { href: "/products", label: await tServer("Products") },
        { href: "/orgs", label: await tServer("Companies") },
      ]
    : role === "explorer"
      ? [
          // Products LEADS: it is EXPLORER_HOME, so it is both the first thing
          // they want and the place the gate returns them to.
          //
          // No "New" chip on it, unlike the founder rail. The chip points at a
          // brand-new surface worth a detour; for an explorer this is the page
          // they land on every single visit, and a permanent badge on your own
          // home is the noise that teaches people to ignore the chip. Meetups
          // keeps its marker — that one IS news to them.
          { href: "/products", label: await tServer("Products") },
          { href: "/community", label: await tServer("Community") },
          ...insightsItem,
          {
            href: "/meetups",
            label: await tServer("Meetups"),
            ...(FEATURES.meetupsNew ? { tag: await tServer("New") } : {}),
          },
          // Nothing below this line. An explorer may comment and may RSVP
          // (lib/roles.ts), and both of those happen on the four surfaces
          // above — there is no fifth place for them to go. In particular: no
          // Connections badge, because they cannot receive an interest or a
          // DM, which is why the two reads for it are skipped above.
        ]
      : [
          // Products LEADS, where Dashboard used to be: there is no dashboard
          // any more (2026-11-12) and the deck is the page a founder lands on.
          // No "New" chip on it for the explorer's reason: a permanent badge
          // on your own landing is noise.
          { href: "/products", label: await tServer("Products") },
          {
            href: "/meetups",
            label: await tServer("Meetups"),
            // Launch marker, not a surface gate: the item renders either way.
            ...(FEATURES.meetupsNew ? { tag: await tServer("New") } : {}),
          },
          { href: "/community", label: await tServer("Community") },
          ...insightsItem,
          { href: "/browse", label: await tServer("Founders") },
          {
            href: "/matches",
            label: await tServer("Connections"),
            badge: (receivedPending ?? 0) + (unreadMessages ?? 0),
          },
          // Hidden for the meetups soft launch, kept in place so flipping the
          // flag puts them back exactly here. Investors keep theirs above.
          ...(FEATURES.companies
            ? [{ href: "/orgs", label: await tServer("Companies") }]
            : []),
          ...(FEATURES.funding
            ? [{ href: "/funding", label: await tServer("Funding") }]
            : []),
          // No "Profile insights" (/activity): hidden from the rail, the
          // owner's call (2026-11-13). The page still answers its URL, and
          // SidebarNav keeps its icon, so putting it back is this one line:
          // { href: "/activity", label: await tServer("Profile insights") },
        ];

  // Every item in a gated role's rail must be a route that role may READ, or
  // the link is a redirect to somewhere else dressed up as navigation. This is
  // the one check that would have caught the Products/investor bug the comment
  // in that array describes, so it is here rather than in a reviewer's head.
  //
  // Dev-only and non-fatal: a wrong nav item is a usability bug, not a reason
  // to 500 every signed-in page in production. Checked BEFORE the Admin push
  // and only for app-shell routes, because THREE legitimate items are outside
  // this question: /insights and /products are MARKETING routes the gate never
  // evaluates (so no role can be bounced off either, and the isAppShellRoute
  // guard below correctly goes quiet on them), and Admin is a GRANTED flag
  // independent of account_type (an admin on a gated role is a pre-existing
  // posture to settle in the route allowlist, not here).
  if (process.env.NODE_ENV !== "production") {
    for (const item of navItems) {
      if (isAppShellRoute(item.href) && !canRoleRead(role, item.href)) {
        console.error(
          `[AppSidebar] "${item.href}" is in the ${role} rail but canRoleRead ` +
            `refuses it — the gate will bounce it to ${roleHome(role)}. Nav and ` +
            `the allowlist in lib/roles.ts are ONE change.`,
        );
      }
    }
  }

  if (
    isAdmin({
      email: user.email,
      isAdminFlag: profile?.is_admin as boolean | null,
    })
  ) {
    navItems.push({ href: "/admin/overview", label: await tServer("Admin") });
  }

  const signOutLabel = await tServer("Sign out");
  const profileLabel = await tServer("Your profile");
  const legalLabel = await tServer("Legal");
  const legal = await Promise.all(
    LEGAL_LINKS.map(async (l) => ({ href: l.href, label: await tServer(l.label) })),
  );

  return (
    <>
      {/* The rail, from 768px — 256px, or a 64px icon rail (the
          `rail-collapsed:` variant, keyed off the shell's data-sidebar /
          data-overlay; the cookie is read in AppShell so the first paint is
          already right at every width).

          The rail ANIMATES its width and CLIPS (overflow-clip); the inner
          column does not animate — it snaps to its final width. So expanding
          reveals a fully laid-out 256px rail as the edge slides out, instead
          of labels wrapping and squeezing through every frame, and collapsing
          shows the compact column at once while the white edge retracts.
          Clipping is safe because nothing that must escape the rail is
          absolutely positioned inside it: the tooltips and the bell / company
          popovers are `fixed`, which the rail does not clip. overflow-clip
          rather than -hidden so a focused element can never scroll the rail
          sideways.

          z-40: above the page's own fixed bars (z-30 — the profile and
          company CTA bars, which at 768-1023 sit beside this rail) so an icon
          tooltip is never painted under one; below the skip link (z-50).
          As the OVERLAY drawer (768-1279, toggle pressed) it rises to z-50,
          over SidebarFrame's scrim, and takes the overlay shadow. Dialogs are
          z-50 too and later in the DOM, so they still cover it. */}
      <aside
        id={RAIL_ID}
        className="hidden md:block fixed inset-y-0 left-0 z-40 rail-overlay:z-50 rail-overlay:shadow-lg w-64 rail-collapsed:w-16 overflow-clip bg-white border-r border-line transition-[width] duration-200 ease-out motion-reduce:transition-none"
      >
        <div className="flex flex-col h-full w-64 rail-collapsed:w-16">
          {/* Brand left, then the collapse toggle and the bell — alerts belong
              where the eye lands, and it matches the mobile top bar. The rail's
              FOOTER is account territory: language, avatar, sign out.
              Collapsed, the same three stack down the 64px column, in the same
              DOM (and so tab) order: mark, toggle, bell. The mark does not move
              at all: px-3.5 puts it at x=14, which is also where the 64px
              column centres it, and py-3.5 puts it 14px down, exactly where h-16
              centres it.

              The row is FULL expanded — measured: mark + wordmark 151px, toggle
              and bell 36px each, inside 228px. Anything added here needs room
              taken from somewhere else first. */}
          <div className="px-3.5 h-16 flex items-center justify-between gap-1 shrink-0 rail-collapsed:h-auto rail-collapsed:flex-col rail-collapsed:justify-start rail-collapsed:gap-1 rail-collapsed:px-0 rail-collapsed:py-3.5">
            {/* The role's landing — see homeHref above. */}
            <Link href={homeHref} className="flex items-center gap-2.5">
              <BrandMark size="sm" />
              <Wordmark className="text-base rail-collapsed:hidden" />
            </Link>
            <div className="flex items-center rail-collapsed:flex-col rail-collapsed:gap-1">
              <SidebarToggle />
              <NotificationBell
                items={notifItems}
                unreadCount={unreadNotifs ?? 0}
                placement="rail"
              />
            </div>
          </div>

          <SidebarNav items={navItems} />

          {/* Collapsed, every control here is a 40px icon tile centred in the
              column, and the text it showed becomes its hover/focus tooltip
              (RAIL_TIP) — still its accessible name. */}
          <div className="shrink-0 border-t border-line p-3 space-y-3 rail-collapsed:space-y-1 rail-collapsed:flex rail-collapsed:flex-col rail-collapsed:items-center">
            {/* Hidden for the meetups soft launch — company chrome. The reads
                above are gated on the same flag, so this is off, not just empty. */}
            {FEATURES.companies && activeOrgId && (
              <OrgSwitcher orgs={myOrgs} activeId={activeOrgId} rail />
            )}
            <div className="flex items-center gap-2">
              <LanguageSwitcher rail />
            </div>
            {/* No `title` here (the phone bar keeps one): on the icon rail it
                stacked the browser's own "Your profile" tooltip on top of the
                RAIL_TIP name, two tooltips with two different texts. */}
            <Link
              href={myProfileHref}
              className="group/rail flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-cream transition-colors rail-collapsed:w-10 rail-collapsed:h-10 rail-collapsed:p-0 rail-collapsed:justify-center"
            >
              <Avatar
                name={profile?.full_name ?? user.email}
                url={profile?.photo_url}
                size="sm"
              />
              <span className={`text-sm text-ink truncate ${RAIL_TIP}`}>
                {profile?.full_name ?? user.email}
              </span>
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                className="group/rail w-full text-left px-2 py-2 text-sm text-ink-muted hover:text-navy tracking-wide rail-collapsed:flex rail-collapsed:items-center rail-collapsed:justify-center rail-collapsed:w-10 rail-collapsed:h-10 rail-collapsed:p-0"
              >
                {/* Collapsed only: expanded, the word is the control. */}
                <LogOut
                  aria-hidden="true"
                  className="hidden rail-collapsed:block w-5 h-5"
                  strokeWidth={1.5}
                />
                <span className={RAIL_TIP}>{signOutLabel}</span>
              </button>
            </form>
            {/* The legal trio. The signed-in shell has no footer, so this is
                where a member finds the privacy policy — on the full rail and
                in the overlay drawer; the icon rail has no room for words, and
                its toggle is one press from here. Wraps rather than squeezing:
                the Thai labels are long and 12px is their floor. */}
            <nav
              aria-label={legalLabel}
              className="px-2 flex flex-wrap gap-x-3 gap-y-1 rail-collapsed:hidden"
            >
              {legal.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-xs leading-5 text-ink-muted hover:text-navy transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </aside>

      {/* Phone top bar, below 768px */}
      <header className="md:hidden sticky top-0 z-30 bg-white border-b border-line">
        <div className="px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <MobileMenu
              className="md:hidden"
              links={navItems}
              legal={legal}
              legalLabel={legalLabel}
              footer={
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="w-full text-center py-2.5 border border-line text-ink hover:border-navy tracking-wide text-sm"
                  >
                    {signOutLabel}
                  </button>
                </form>
              }
            />
            <Link href={homeHref} className="flex items-center gap-2.5">
              <BrandMark size="sm" />
              <Wordmark className="text-base hidden sm:inline" />
            </Link>
          </div>
          <div className="flex items-center gap-3">
            {/* Hidden for the meetups soft launch — same gate as the rail. */}
            {FEATURES.companies && activeOrgId && (
              <OrgSwitcher orgs={myOrgs} activeId={activeOrgId} />
            )}
            <LanguageSwitcher />
            <NotificationBell
              items={notifItems}
              unreadCount={unreadNotifs ?? 0}
            />
            <Link href={myProfileHref} title={profileLabel}>
              <Avatar
                name={profile?.full_name ?? user.email}
                url={profile?.photo_url}
                size="sm"
              />
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}
