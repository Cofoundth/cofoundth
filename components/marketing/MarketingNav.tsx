import Link from "next/link";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { BrandMark, Wordmark } from "@/components/Brand";
import { AuthReturnLink } from "./AuthReturnLink";

// The logged-out bar only. A signed-in visitor never reaches this: the
// marketing layout hands them the app shell (components/AppShell.tsx) instead.
// Not drawn on the product deck ([data-marketing-chrome], app/globals.css),
// which carries its own sign-in in its top line.
export async function MarketingNav() {
  const locale = await getLocale();
  const tr = (en: string) => t(en, locale);

  return (
    <nav data-marketing-chrome="" className="bg-white border-b border-line">
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between gap-2 h-16 sm:h-20">
          {/* shrink-0, not min-w-0: the only shrinkable item in this row, it
              was squeezed narrower than the 40px mark inside it at phone
              widths, and the mark (shrink-0 itself) spilled out of the link
              and under the language switcher. */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 shrink-0">
            <BrandMark size="md" />
            <div className="hidden sm:block text-left min-w-0">
              <Wordmark />
              <div className="text-xs text-ink-muted uppercase tracking-[0.2em] mt-1">
                {tr("Est. 2026 · Bangkok")}
              </div>
            </div>
          </Link>

          {/* gap-1.5 below 360px: at 320 the English row ("ไทย", "Sign in",
              "Join Cofoundee") is 1.6px wider than the space beside the mark
              at gap-2. 360 and up are unchanged. */}
          <div className="flex items-center gap-1.5 min-[360px]:gap-2 sm:gap-4 shrink-0">
            <LanguageSwitcher />
            {/* On a product page and on the deck these carry `next` back to
                where the reader is: see AuthReturnLink. */}
            <AuthReturnLink
              base="/login"
              className="text-sm text-ink hover:text-navy tracking-wide whitespace-nowrap"
            >
              {tr("Sign in")}
            </AuthReturnLink>
            <AuthReturnLink
              base="/signup"
              className="px-3 sm:px-5 py-2 sm:py-2.5 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide transition-colors whitespace-nowrap rounded-full"
            >
              {tr("Join Cofoundee")}
            </AuthReturnLink>
          </div>
        </div>
      </div>
    </nav>
  );
}
