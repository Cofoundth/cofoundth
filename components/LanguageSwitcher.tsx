import { Globe } from "lucide-react";
import { type Locale } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { setLocaleAction } from "@/app/actions/locale";

export async function LanguageSwitcher({
  variant = "light",
}: {
  variant?: "light" | "dark";
}) {
  const locale = await getLocale();
  const next: Locale = locale === "th" ? "en" : "th";
  const label = locale === "th" ? "EN" : "ไทย";

  const colorClass =
    variant === "dark"
      ? "text-slate-200 hover:text-white"
      : "text-ink hover:text-navy";

  return (
    <form action={setLocaleAction} className="flex">
      <input type="hidden" name="locale" value={next} />
      <button
        type="submit"
        className={`inline-flex items-center gap-1.5 text-sm tracking-wide ${colorClass}`}
        title={locale === "th" ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"}
      >
        <Globe className="w-4 h-4" strokeWidth={1.5} />
        {label}
      </button>
    </form>
  );
}
