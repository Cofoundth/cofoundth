import Link from "next/link";
import { SignupForm } from "@/components/auth/SignupForm";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { LinkedInSignInButton } from "@/components/auth/LinkedInSignInButton";
import { tServer } from "@/lib/i18n-server";

export default async function SignupPage() {
  const tr = (en: string) => tServer(en);
  return (
    <div className="bg-white border border-line p-8 lg:p-10">
      <div className="text-xs uppercase tracking-[0.25em] text-gold mb-4">
        {await tr("Phase I · Free for all founders")}
      </div>
      <h1 className="text-3xl mb-2">{await tr("Create your profile")}</h1>
      <p className="text-sm text-ink-muted mb-8">
        {await tr("Join Thailand’s most serious community of co-founders.")}
      </p>

      <SignupForm />

      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-line" />
        <span className="text-xs uppercase tracking-[0.2em] text-ink-muted">
          {await tr("or")}
        </span>
        <div className="flex-1 h-px bg-line" />
      </div>

      <div className="space-y-3">
        <GoogleSignInButton />
        <LinkedInSignInButton />
      </div>

      <p className="mt-6 text-xs text-ink-muted leading-relaxed">
        {await tr(
          "By continuing, you agree to our Terms and acknowledge our PDPA privacy policy.",
        )}
      </p>

      <div className="mt-8 pt-6 border-t border-line text-center text-sm text-ink-muted">
        {await tr("Already on Cofoundee?")}{" "}
        <Link href="/login" className="text-navy hover:text-gold">
          {await tr("Sign in")}
        </Link>
      </div>
    </div>
  );
}
