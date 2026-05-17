import { Globe } from "lucide-react";
import { getLocale, type Locale } from "@/lib/i18n";
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
    <form action={setLocaleAction}>
      <input type="hidden" name="locale" value={next} />
      <button
        type="submit"
        className={`inline-flex items-center gap-1.5 text-xs tracking-wide ${colorClass}`}
        title={locale === "th" ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"}
      >
        <Globe className="w-3.5 h-3.5" strokeWidth={1.5} />
        {label}
      </button>
    </form>
  );
}
