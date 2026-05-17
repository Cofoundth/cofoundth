import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BrandMark, Wordmark } from "@/components/Brand";

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

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <header className="border-b border-line bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-20 flex items-center">
          <Link href="/" className="flex items-center gap-3">
            <BrandMark size="md" />
            <Wordmark />
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">{children}</div>
      </main>

      <footer className="py-6 text-center text-xs text-ink-muted">
        &copy; 2026 Cofoundee Co., Ltd. &middot; PDPA compliant
      </footer>
    </div>
  );
}
