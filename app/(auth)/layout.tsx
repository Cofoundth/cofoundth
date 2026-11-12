import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BrandMark } from "@/components/Brand";

// Sign in, sign up, forgot password: ONE SCREEN, no scrolling (the owner's
// call, 2026-11-11). Measured at 1198x630 the sign-in page was 891px tall — an
// 81px header bar, 64px of copyright footer and 128px of padding around a 618px
// card. So there is no bar and no footer: the mark home floats in the top-left
// corner exactly where the product deck's sits (same container, same gutters,
// same size), so following "Sign in" from the deck leaves it where it was. On a
// phone it takes its own line, because the form runs edge to edge there; from
// 640px it takes no height at all. The 448px cards never reach the corner; the
// wide sign-up card can, on a short screen 768-919px wide, and is then drawn
// over the mark (AUTH_CARD's z-10) rather than under it. `pointer-events-none` on that full-width strip so it can
// never sit over the card's top edge on a short screen and swallow a press.
//
// Each page draws its own panel, AUTH_CARD (components/auth/auth-card.ts),
// which sets its width — sign-up widens to two columns from md so that it,
// too, fits one screen (see its page). Below 640px there is no card: the page
// is white instead of sand, so the role cards' cream "selected" state still
// reads against it.
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // If already signed in, skip the auth pages entirely
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // To "/", which proxy.ts answers for a signed-in member with their landing
  // (the deck; an investor's own home; onboarding if a founder still owes it).
  if (user) {
    redirect("/");
  }

  return (
    <div className="relative min-h-dvh flex flex-col bg-white sm:bg-cream">
      <header className="pointer-events-none sm:absolute sm:inset-x-0 sm:top-0">
        <div className="mx-auto max-w-[1440px] px-4 pt-3 sm:px-6 lg:px-10 lg:pt-4">
          <Link
            href="/"
            aria-label="Cofoundee"
            className="pointer-events-auto inline-flex rounded-[10px]"
          >
            <BrandMark size="sm" />
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-5 sm:px-6 sm:py-3">
        {children}
      </main>
    </div>
  );
}
