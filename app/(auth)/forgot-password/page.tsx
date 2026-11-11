import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { AUTH_CARD } from "@/components/auth/auth-card";

export default function ForgotPasswordPage() {
  return (
    <div className={AUTH_CARD}>
      <h1 className="text-d2 mb-2">Reset your password</h1>
      <p className="text-sm text-ink-muted mb-6">
        Enter your email and we&rsquo;ll send a 6-digit code to verify it&rsquo;s
        you.
      </p>

      <ForgotPasswordForm />

      <div className="mt-6 pt-5 short:mt-5 short:pt-4 border-t border-line text-center text-sm text-ink-muted">
        Remembered it?{" "}
        <Link href="/login" className="text-navy hover:text-gold-ink">
          Sign in
        </Link>
      </div>
    </div>
  );
}
