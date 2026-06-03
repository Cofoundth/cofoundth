"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { LOCALES, LOCALE_COOKIE, type Locale } from "@/lib/i18n";

export async function setLocaleAction(formData: FormData) {
  const raw = String(formData.get("locale") ?? "");
  if (!LOCALES.includes(raw as Locale)) return;

  const store = await cookies();
  store.set(LOCALE_COOKIE, raw, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  // Persist to the profile too, so transactional emails reach the user in
  // the language they actually use (cookies aren't available when sending).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("profiles").update({ locale: raw }).eq("id", user.id);
  }

  revalidatePath("/", "layout");
}
