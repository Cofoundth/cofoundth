"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
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

  revalidatePath("/", "layout");
}
