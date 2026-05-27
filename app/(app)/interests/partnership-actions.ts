"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Lightweight server actions for accept/decline/withdraw on the interests
// page. The full send action lives in app/(app)/companies/actions.ts.

export async function acceptPartnershipAction(
  requestId: string,
  formData: FormData,
) {
  const responseNote = String(formData.get("response_note") ?? "")
    .trim()
    .slice(0, 1000);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("partnership_requests")
    .update({
      status: "accepted",
      response_note: responseNote || null,
    })
    .eq("id", requestId)
    .eq("to_profile_id", user.id)
    .eq("status", "open");

  revalidatePath("/interests");
  revalidatePath("/matches");
}

export async function declinePartnershipAction(
  requestId: string,
  formData: FormData,
) {
  const responseNote = String(formData.get("response_note") ?? "")
    .trim()
    .slice(0, 1000);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("partnership_requests")
    .update({
      status: "declined",
      response_note: responseNote || null,
    })
    .eq("id", requestId)
    .eq("to_profile_id", user.id)
    .eq("status", "open");

  revalidatePath("/interests");
}

export async function withdrawPartnershipAction(requestId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("partnership_requests")
    .update({ status: "withdrawn" })
    .eq("id", requestId)
    .eq("from_profile_id", user.id)
    .eq("status", "open");

  revalidatePath("/interests");
}
