import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <div className="bg-white border border-line p-8 lg:p-10">
      <div className="text-xs uppercase tracking-[0.25em] text-gold mb-4">
        Account recovery
      </div>
      <h1 className="text-3xl mb-2">Reset your password</h1>
      <p className="text-sm text-ink-muted mb-8">
        Enter your email and we&rsquo;ll send a 6-digit code to verify it&rsquo;s
        you.
      </p>

      <ForgotPasswordForm />

      <div className="mt-8 pt-6 border-t border-line text-center text-sm text-ink-muted">
        Remembered it?{" "}
        <Link href="/login" className="text-navy hover:text-gold">
          Sign in
        </Link>
      </div>
    </div>
  );
}
