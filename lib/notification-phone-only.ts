// Which product notifications a COMPUTER cannot follow. A comment or a mention
// on a product that only runs on a phone opens a page that 404s on a computer
// for anyone but its maker and an admin (the founder's call, 2026-11-18;
// app/(marketing)/products/[id]/page.tsx). The bell and /notifications show
// those rows unlinked, with "Opens on a phone", the way /rewards does: never a
// link to a page that will not open.
//
// Server-only: viewerKind() reads the request. The products are read with the
// reader's own client, so RLS still decides what they may see.

import type { SupabaseClient } from "@supabase/supabase-js";
import { viewerKind } from "@/lib/device";
import { isPhoneOnly } from "@/app/(marketing)/products/product-view";

type NotifRow = { type: unknown; entity_id: unknown };

/** The entity ids, among these notification rows, of products this reader
 *  cannot open here. Empty on anything but a computer and for an admin; no
 *  query at all when no row is a comment or a mention, and the admin question
 *  only once some product would be hidden (the bell asks every 15 seconds). */
export async function phoneOnlyNotifTargets(
  supabase: SupabaseClient,
  rows: readonly NotifRow[],
  reader: { id: string; isAdmin: () => boolean | Promise<boolean> },
): Promise<Set<string>> {
  // Every comment and mention, whatever its post_kind says: a row from before
  // migration 0081 has none, and still lands on the product
  // (lib/notifications.ts), so the kind is read from the post itself.
  const ids = [
    ...new Set(
      rows.flatMap((r) =>
        (r.type === "comment" || r.type === "mention") &&
        typeof r.entity_id === "string"
          ? [r.entity_id]
          : [],
      ),
    ),
  ];
  if (ids.length === 0 || (await viewerKind()) !== "computer") return new Set();
  // Not a hidden product: that one opens on no device, so "Opens on a phone"
  // would be untrue. It keeps its plain link, as every notification about a
  // removed post does.
  const { data } = await supabase
    .from("forum_posts")
    .select("id, author_id, link_url, platforms")
    .in("id", ids)
    .eq("kind", "show_and_tell")
    .eq("hidden", false);
  const targets = (data ?? [])
    .filter(
      (p) =>
        p.author_id !== reader.id &&
        isPhoneOnly(p.link_url as string | null, p.platforms as string[] | null),
    )
    .map((p) => p.id as string);
  if (targets.length === 0 || (await reader.isAdmin())) return new Set();
  return new Set(targets);
}
