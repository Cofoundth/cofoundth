import { Globe } from "lucide-react";
import { type Locale } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { setLocaleAction } from "@/app/actions/locale";
import { RAIL_TIP } from "@/lib/sidebar";

export async function LanguageSwitcher({
  variant = "light",
  rail = false,
}: {
  variant?: "light" | "dark";
  /**
   * The rail's copy. As an icon rail it becomes a 40px globe tile and
   * "EN"/"ไทย" becomes its hover/focus tooltip (still the button's
   * accessible name). Off everywhere else — the `rail-collapsed:` classes
   * must not reach the phone bar or the marketing header.
   */
  rail?: boolean;
}) {
  const locale = await getLocale();
  const next: Locale = locale === "th" ? "en" : "th";
  const label = locale === "th" ? "EN" : "ไทย";

  const colorClass =
    variant === "dark"
      ? "text-white/80 hover:text-white"
      : "text-ink hover:text-navy";

  return (
    <form action={setLocaleAction} className="flex">
      <input type="hidden" name="locale" value={next} />
      <button
        type="submit"
        className={`inline-flex items-center gap-1.5 text-sm tracking-wide ${colorClass} ${
          rail
            ? "group/rail rail-collapsed:w-10 rail-collapsed:h-10 rail-collapsed:justify-center rail-collapsed:gap-0"
            : ""
        }`}
        // Not on the rail's copy: as an icon tile it stacked the browser's
        // tooltip ("Switch to English") on top of the RAIL_TIP one ("EN").
        title={
          rail
            ? undefined
            : locale === "th"
              ? "Switch to English"
              : "เปลี่ยนเป็นภาษาไทย"
        }
      >
        <Globe
          aria-hidden="true"
          className={`w-4 h-4 ${rail ? "rail-collapsed:w-5 rail-collapsed:h-5" : ""}`}
          strokeWidth={1.5}
        />
        <span className={rail ? RAIL_TIP : undefined}>{label}</span>
      </button>
    </form>
  );
}
