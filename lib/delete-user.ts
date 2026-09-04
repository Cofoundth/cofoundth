// The one implementation of "delete this account for good", shared by the
// member's own Settings > Danger zone (deleteAccountAction) and the admin
// console (adminDeleteUser). It used to exist twice, and the two copies had
// already drifted apart on the part that matters — ORDER.
//
// Most of the user's data disappears on its own: everything that references
// profiles(id) with `on delete cascade` goes when the auth user (and with it
// the profile row) is deleted. The exceptions are the four `on delete
// restrict` / no-action columns below, and those are the whole reason this
// file is not three lines:
//
//   organizations.created_by   restrict (0049:26)  -> refuse, ask the owner
//   org_deals.proposed_by      restrict (0053:17)  -> refuse, ask the owner
//   meetups.created_by         restrict (0058:30)  -> delete the meetups
//   org_deals.confirmed_by     no action (0053:31) -> null it out
//   investor_deals.confirmed_by no action (0056:41) -> null it out
//
// A `restrict` reference does not fail loudly in the UI — it makes
// deleteUser() return an error AFTER the caller has already wiped the user's
// storage, leaving an account that still exists with its avatar and post
// images gone. So: check first, unpick what can be unpicked, delete the auth
// user, and only then touch storage.

import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

export async function hardDeleteUser(
  admin: Admin,
  userId: string,
): Promise<{ error?: string }> {
  // 1. PRE-FLIGHT. Both of these are `on delete restrict`: they would abort
  // the auth delete, and neither can be resolved automatically — an
  // organization has other members and a live deal has a counterparty, so the
  // user has to decide what happens to them.
  const [{ count: orgCount }, { count: dealCount }] = await Promise.all([
    admin
      .from("organizations")
      .select("id", { count: "exact", head: true })
      .eq("created_by", userId),
    admin
      .from("org_deals")
      .select("id", { count: "exact", head: true })
      .eq("proposed_by", userId),
  ]);
  if ((orgCount ?? 0) > 0) {
    return { error: "Transfer or delete your organizations first." };
  }
  if ((dealCount ?? 0) > 0) {
    return { error: "Close your open partnership deals first." };
  }

  // 2. The no-action references. Nulling them keeps the deal rows intact for
  // the counterparty — the confirmation happened, the confirmer is gone.
  await Promise.all([
    admin
      .from("org_deals")
      .update({ confirmed_by: null })
      .eq("confirmed_by", userId),
    admin
      .from("investor_deals")
      .update({ confirmed_by: null })
      .eq("confirmed_by", userId),
  ]);

  // 3. Meetups this user hosted are also `on delete restrict`, but here the
  // right answer is obvious: no host, no meetup. Their RSVPs (0058:38) and
  // chat messages (0068:8) reference meetups(id) `on delete cascade`, so they
  // go with them and need no separate pass.
  const { error: meetupError } = await admin
    .from("meetups")
    .delete()
    .eq("created_by", userId);
  if (meetupError) {
    console.error("[hardDeleteUser] meetups", meetupError);
    return { error: "Couldn't delete the account. Try again." };
  }

  // 4. The account itself. Everything above exists so that this line can
  // succeed; if it still fails, nothing destructive has happened yet.
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    console.error("[hardDeleteUser] auth", error);
    return { error: "Couldn't delete the account. Try again." };
  }

  // 5. ONLY NOW the storage objects, which no foreign key protects and no
  // rollback can bring back. Best-effort: the account is already gone, and a
  // failed cleanup must not report the deletion as failed.
  for (const bucket of ["avatars", "post-images"]) {
    const { data: files } = await admin.storage.from(bucket).list(userId);
    if (files?.length) {
      await admin.storage
        .from(bucket)
        .remove(files.map((f) => `${userId}/${f.name}`));
    }
  }

  return {};
}
