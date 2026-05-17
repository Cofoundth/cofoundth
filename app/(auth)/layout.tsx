import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
            <div className="w-10 h-10 bg-navy flex items-center justify-center">
              <span className="text-white text-lg font-serif font-bold tracking-tight">
                C
              </span>
            </div>
            <div className="font-serif text-xl text-navy tracking-tight">
              Cofoundee
            </div>
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
