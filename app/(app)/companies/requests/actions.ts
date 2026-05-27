"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AskState = { error?: string } | null;

const TYPES = [
  "integration",
  "distribution",
  "white_label",
  "co_marketing",
  "vendor_supplier",
  "other",
] as const;

export async function createAskAction(
  _prev: AskState,
  formData: FormData,
): Promise<AskState> {
  const subject = String(formData.get("subject") ?? "").trim();
  const context = String(formData.get("context") ?? "").trim();
  const requestType = String(formData.get("request_type") ?? "").trim();
  const deadlineRaw = String(formData.get("deadline_at") ?? "").trim();

  if (!subject || subject.length < 5 || subject.length > 200) {
    return { error: "Subject must be 5–200 characters." };
  }
  if (!context || context.length < 50 || context.length > 2000) {
    return { error: "Add more context — 50–2000 characters." };
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

  // Caller must be an onboarded company
  const { data: me } = await supabase
    .from("profiles")
    .select("id, type, onboarded")
    .eq("id", user.id)
    .single();
  if (!me || me.type !== "company" || !me.onboarded) {
    return {
      error:
        "Your profile must be a Company type and fully onboarded to post a partnership ask.",
    };
  }

  const { error } = await supabase.from("partnership_asks").insert({
    author_id: user.id,
    request_type: requestType,
    subject,
    context,
    deadline_at: deadlineAt?.toISOString() ?? null,
  });

  if (error) {
    console.error("[partnership_asks.insert]", error);
    return { error: "Couldn't post. Try again." };
  }

  revalidatePath("/companies/requests");
  redirect("/companies/requests");
}

export async function updateAskStatusAction(
  askId: string,
  status: "open" | "filled" | "closed",
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("partnership_asks")
    .update({ status })
    .eq("id", askId)
    .eq("author_id", user.id);

  revalidatePath("/companies/requests");
}
