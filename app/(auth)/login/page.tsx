import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { LinkedInSignInButton } from "@/components/auth/LinkedInSignInButton";
import { tServer } from "@/lib/i18n-server";

export default async function LoginPage() {
  const tr = (en: string) => tServer(en);
  return (
    <div className="bg-white border border-line p-8 lg:p-10">
      <div className="text-xs uppercase tracking-[0.25em] text-gold mb-4">
        {await tr("Welcome back")}
      </div>
      <h1 className="text-3xl mb-2">{await tr("Sign in")}</h1>
      <p className="text-sm text-ink-muted mb-8">
        {await tr("Continue building with your co-founder community.")}
      </p>

      <LoginForm />

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

      <div className="mt-8 pt-6 border-t border-line text-center text-sm text-ink-muted">
        {await tr("New to Cofoundee?")}{" "}
        <Link href="/signup" className="text-navy hover:text-gold">
          {await tr("Create your profile")}
        </Link>
      </div>
    </div>
  );
}
