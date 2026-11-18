// The monthly draw, in one line, on a member's OWN /profile hub (the
// founder's call, 2026-11-18). Never on the public profile: a streak other
// members can see is the badge CLAUDE.md keeps the draw from becoming. The
// line only says where they stand this month; /rewards has the rest.

import type { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
import { memberDrawComments } from "@/lib/draw-data";
import {
  bangkokDay,
  DRAW_STREAK_DAYS,
  judgeComments,
  monthOf,
  qualifyingDays,
  standing,
} from "@/lib/rewards";
import { tServer } from "@/lib/i18n-server";

/**
 * "You’re in", "{n} of 5 days" (the streak still alive, as /rewards counts
 * it), or — for the team, who are never in the draw — "Team account", kept
 * that short because it shares a 320px row with the label. Null when the
 * comments couldn't be read: the row then just links to /rewards rather than
 * show a number it can't stand behind.
 */
export async function drawStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { id: string; email?: string | null },
): Promise<string | null> {
  const now = new Date();
  const month = monthOf(now);
  const [comments, staff] = await Promise.all([
    memberDrawComments(supabase, user.id, month),
    isAdminUser(supabase, user),
  ]);
  if (staff) return tServer("Team account");
  if (!comments) return null;
  const { productsByDay } = judgeComments(comments, user.id);
  const { eligible, currentRun } = standing(
    month,
    qualifyingDays(productsByDay),
    bangkokDay(now.toISOString()),
  );
  if (eligible) return tServer("You’re in");
  return (await tServer("{n} of {total} days"))
    .replace("{n}", () => String(currentRun))
    .replace("{total}", () => String(DRAW_STREAK_DAYS));
}
