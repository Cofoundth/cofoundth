"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseAccountRole } from "@/lib/roles";

// ---------------------------------------------------------------------------
// The one allowed role transition: explorer -> founder
// ---------------------------------------------------------------------------
// account_type is chosen once at signup and is otherwise permanent (see
// app/onboarding/actions.ts and app/(auth)/actions.ts, which say so). This is
// the single amendment to that doctrine, and it exists because it IS the
// funnel: someone signs up to try what the community builds, gets inspired,
// builds something, and wants users of their own. Making them abandon the
// account they already commented and RSVP'd from to do that would be a tax on
// the exact behaviour the pivot is chasing.
//
// It is ONE-WAY and it is the only edge. Refused, explicitly, every time:
//   founder  -> explorer    (a maker does not un-make; and profile_complete,
//                            the founder-directory gate, has no reverse)
//   anything -> investor    (investor accounts are onboarded by hand —
//                            FEATURES.investorSignup is false — and an
//                            investor_profiles row is not self-serve)
//   investor -> anything    (6 real accounts in production; their surfaces and
//                            gates stay exactly as they are)
//
// Lives in app/actions/ rather than beside a route because it is not one
// route's action: the upgrade affordance belongs wherever an explorer realises
// they are building something — the /products CTA today, plausibly the profile
// hub or settings tomorrow. Same reason app/actions/locale.ts sits here.
// ---------------------------------------------------------------------------

export type UpgradeToFounderState = { error?: string } | null;

/**
 * Promote the CALLING user from explorer to founder, then send them into
 * founder onboarding. Nothing else about the row is touched.
 *
 * Shape matches the rest of the app's error-reporting actions
 * (saveOnboardingAction, updateProfileAction, deleteAccountAction): use it with
 * `useActionState`, which supplies both arguments.
 */
/* eslint-disable @typescript-eslint/no-unused-vars -- useActionState always
   calls an action with (previousState, formData) and this one reads neither:
   there are no fields to read, the decision comes entirely from the caller's
   own row. Both parameters are part of the required signature, not leftovers.
   Re-enabled on the first line of the body, so the rule still covers the
   function itself. */
export async function upgradeToFounderAction(
  _prev: UpgradeToFounderState,
  _formData: FormData,
): Promise<UpgradeToFounderState> {
  /* eslint-enable @typescript-eslint/no-unused-vars */
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated. Please sign in again." };

  const { data: prof } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .maybeSingle();
  const role = parseAccountRole(prof?.account_type);

  // Already a founder: treat it as done rather than as an error. The realistic
  // way to arrive here is a double submit or a stale page — the first call
  // flipped the role and this one should land in the same place, not show a
  // failure for something that already succeeded.
  if (role === "founder") redirect("/onboarding");

  if (role !== "explorer") {
    return {
      error: "This account can’t be switched to a founder account.",
    };
  }

  // `.eq("account_type", "explorer")` is the transition itself, expressed in
  // the WHERE clause: the write cannot land on a row that has since become
  // anything else, so two concurrent submits can only walk this one edge.
  //
  // role_chosen = true because the OAuth callback applies a `?role=` parameter
  // only while role_chosen is false. Leaving it false would let a later Google
  // sign-in carrying a stale role= put this account back to explorer.
  //
  // This runs under the caller's own session, so RLS (profiles_update_own) is
  // the second check that it is their row and no one else's — no service role
  // anywhere in this file. (A determined explorer could also PATCH their own
  // account_type straight at the REST API: the role is self-selected at signup
  // anyway, so there is nothing here to protect, which is why the gate is about
  // walking one defined edge rather than about trust.)
  const { error } = await supabase
    .from("profiles")
    .update({ account_type: "founder", role_chosen: true })
    .eq("id", user.id)
    .eq("account_type", "explorer");

  if (error) return { error: error.message };

  // The role decides the sidebar nav, the (app) layout's route gate and the
  // profile banner — all of which render inside the root layout — so the whole
  // tree is stale, not one page.
  revalidatePath("/", "layout");

  // Straight into the founder wizard: they are now a founder with none of a
  // founder's profile, and app/(app)/layout.tsx will send them here anyway.
  redirect("/onboarding");
}
