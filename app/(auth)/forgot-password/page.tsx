import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { AUTH_CARD } from "@/components/auth/auth-card";
import { tServer } from "@/lib/i18n-server";

// Translated like every other auth page (it was the one left in English on the
// Thai default locale). The paragraph's key uses the typographic apostrophe
// U+2019, byte for byte as lib/translations.json has it.
export default async function ForgotPasswordPage() {
  const [title, intro, remembered, signIn] = await Promise.all([
    tServer("Reset your password"),
    tServer(
      "Enter your email and we’ll send a 6-digit code to verify it’s you.",
    ),
    tServer("Remembered it?"),
    tServer("Sign in"),
  ]);
  return (
    <div className={AUTH_CARD}>
      <h1 className="text-d2 mb-2">{title}</h1>
      <p className="text-sm text-ink-muted mb-6">{intro}</p>

      <ForgotPasswordForm />

      <div className="mt-6 pt-5 short:mt-5 short:pt-4 border-t border-line text-center text-sm text-ink-muted">
        {remembered}{" "}
        <Link href="/login" className="text-navy hover:text-gold-ink">
          {signIn}
        </Link>
      </div>
    </div>
  );
}
