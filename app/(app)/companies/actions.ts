"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPartnershipRequestEmail } from "@/lib/email";

export type RequestState = { error?: string; ok?: true } | null;

const TYPES = [
  "integration",
  "distribution",
  "white_label",
  "co_marketing",
  "vendor_supplier",
  "other",
] as const;

export async function sendPartnershipRequestAction(
  toProfileId: string,
  _prev: RequestState,
  formData: FormData,
): Promise<RequestState> {
  const subject = String(formData.get("subject") ?? "").trim();
  const context = String(formData.get("context") ?? "").trim();
  const requestType = String(formData.get("request_type") ?? "").trim();
  const deadlineRaw = String(formData.get("deadline_at") ?? "").trim();

  if (!subject || subject.length < 5 || subject.length > 200) {
    return { error: "Subject must be 5–200 characters." };
  }
  if (!context || context.length < 50 || context.length > 2000) {
    return { error: "Tell them more — 50–2000 characters." };
  }
  if (!(TYPES as readonly string[]).includes(requestType)) {
    return { error: "Pick a request type." };
  }
  const deadlineAt = deadlineRaw ? new Date(deadlineRaw) : null;
  if (deadlineAt && isNaN(deadlineAt.getTime())) {
    return { error: "Invalid deadline date." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  // Caller must be a company
  const { data: from } = await supabase
    .from("profiles")
    .select("id, type, company_name, onboarded")
    .eq("id", user.id)
    .single();
  if (!from || from.type !== "company" || !from.onboarded) {
    return {
      error:
        "Your profile must be a Company type and fully onboarded to send partnership requests.",
    };
  }

  // Target must be a company
  const { data: to } = await supabase
    .from("profiles")
    .select("id, type, company_name, full_name, email")
    .eq("id", toProfileId)
    .single();
  if (!to || to.type !== "company") {
    return { error: "Target must be a company profile." };
  }
  if (to.id === user.id) {
    return { error: "Can't send a request to yourself." };
  }

  const { error } = await supabase.from("partnership_requests").insert({
    from_profile_id: user.id,
    to_profile_id: toProfileId,
    request_type: requestType,
    subject,
    context,
    deadline_at: deadlineAt?.toISOString() ?? null,
  });

  if (error) {
    // Unique violation = duplicate open request
    if (error.code === "23505") {
      return {
        error:
          "You already have an open request to this company. Withdraw it first to send a new one.",
      };
    }
    console.error("[partnership_requests.insert]", error);
    return { error: "Couldn't send. Try again." };
  }

  // Fire-and-forget email notification
  void notifyPartnershipRequest({
    toEmail: (to.email as string | null) ?? null,
    toRep: (to.full_name as string) ?? "there",
    toCompany: (to.company_name as string) ?? "your company",
    fromCompany: (from.company_name as string) ?? "A founder",
    subject,
    requestType,
  });

  revalidatePath("/interests");
  revalidatePath("/companies");
  return { ok: true };
}

async function notifyPartnershipRequest(opts: {
  toEmail: string | null;
  toRep: string;
  toCompany: string;
  fromCompany: string;
  subject: string;
  requestType: string;
}) {
  if (!opts.toEmail) return;
  try {
    await sendPartnershipRequestEmail(opts as Parameters<typeof sendPartnershipRequestEmail>[0]);
  } catch (e) {
    console.error("[partnership_request.notify]", e);
  }
}

// Recipient or sender can update the status.

export async function acceptPartnershipRequestAction(
  requestId: string,
  formData: FormData,
) {
  const responseNote = String(formData.get("response_note") ?? "").trim().slice(0, 1000);
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

export async function declinePartnershipRequestAction(
  requestId: string,
  formData: FormData,
) {
  const responseNote = String(formData.get("response_note") ?? "").trim().slice(0, 1000);
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

export async function withdrawPartnershipRequestAction(requestId: string) {
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

// Used by admin pages if needed in future
export { createAdminClient };
