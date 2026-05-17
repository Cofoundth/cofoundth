import Link from "next/link";
import { SignupForm } from "@/components/auth/SignupForm";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { LinkedInSignInButton } from "@/components/auth/LinkedInSignInButton";

export default function SignupPage() {
  return (
    <div className="bg-white border border-line p-8 lg:p-10">
      <div className="text-xs uppercase tracking-[0.25em] text-gold mb-4">
        Phase I &middot; Free for all founders
      </div>
      <h1 className="text-3xl mb-2">Create your profile</h1>
      <p className="text-sm text-ink-muted mb-8">
        Join Thailand&rsquo;s most serious community of co-founders.
      </p>

      <div className="space-y-3">
        <LinkedInSignInButton />
        <GoogleSignInButton />
      </div>

      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-line" />
        <span className="text-xs uppercase tracking-[0.2em] text-ink-muted">
          or
        </span>
        <div className="flex-1 h-px bg-line" />
      </div>

      <SignupForm />

      <p className="mt-6 text-xs text-ink-muted leading-relaxed">
        By continuing, you agree to our Terms and acknowledge our PDPA privacy
        policy.
      </p>

      <div className="mt-8 pt-6 border-t border-line text-center text-sm text-ink-muted">
        Already on CoFound.th?{" "}
        <Link href="/login" className="text-navy hover:text-gold">
          Sign in
        </Link>
      </div>
    </div>
  );
}
