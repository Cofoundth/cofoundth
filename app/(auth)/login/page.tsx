import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
// LinkedIn login disabled for now — provider not enabled in Supabase + no LinkedIn app yet.
// import { LinkedInSignInButton } from "@/components/auth/LinkedInSignInButton";
import { tServer } from "@/lib/i18n-server";
import { authHref } from "@/lib/auth-href";
import { safeNextPath } from "@/lib/safe-next";

// `?next=` is where to land once signed in — a product page's sign-in link
// sets it (lib/auth-href.ts). It is checked here only so a refused value is
// not carried any further; every hop that FOLLOWS it (signInAction, the OAuth
// callback) checks it again for itself.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const next = safeNextPath((await searchParams).next);
  const tr = (en: string) => tServer(en);
  return (
    <div className="bg-white border border-line p-8 lg:p-10 rounded-xl">
      <h1 className="text-d2 mb-2">{await tr("Sign in")}</h1>
      <p className="text-sm text-ink-muted mb-8">
        {await tr("Continue building with your co-founder community.")}
      </p>

      <LoginForm next={next ?? undefined} />

      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-line" />
        <span className="text-xs uppercase tracking-[0.2em] text-ink-muted">
          {await tr("or")}
        </span>
        <div className="flex-1 h-px bg-line" />
      </div>

      <div className="space-y-3">
        <GoogleSignInButton next={next ?? undefined} />
        {/* <LinkedInSignInButton next={next ?? undefined} /> */}
      </div>

      <div className="mt-8 pt-6 border-t border-line text-center text-sm text-ink-muted">
        {await tr("New to Cofoundee?")}{" "}
        <Link
          href={next ? authHref("/signup", next) : "/signup"}
          className="text-navy hover:text-gold-ink"
        >
          {await tr("Create your profile")}
        </Link>
      </div>
    </div>
  );
}
