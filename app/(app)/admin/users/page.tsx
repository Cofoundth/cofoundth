import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/admin";
import { AdminTabs } from "@/components/AdminTabs";
import { type AdminUser } from "./UserRow";
import { UsersAdmin } from "./UsersAdmin";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!(await isAdminUser(supabase, user))) notFound();

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("profiles")
    .select(
      "id, full_name, email, photo_url, slug, onboarded, suspended, verified, is_admin, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(500);

  const list = rows ?? [];
  const total = list.length;
  const active = list.filter((u) => u.onboarded && !u.suspended).length;
  const hidden = list.filter((u) => u.suspended).length;

  const users: AdminUser[] = list.map((u) => ({
    id: u.id as string,
    fullName: (u.full_name as string | null) ?? null,
    email: (u.email as string | null) ?? null,
    photoUrl: (u.photo_url as string | null) ?? null,
    slug: (u.slug as string | null) ?? null,
    onboarded: !!u.onboarded,
    suspended: !!u.suspended,
    verified: !!u.verified,
    isAdmin: !!u.is_admin,
  }));

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-10 py-10">
      <AdminTabs />
      <div className="mb-8 pb-6 border-b border-line">
        <div className="text-xs uppercase tracking-[0.25em] text-gold mb-3">
          Admin
        </div>
        <h1 className="text-4xl mb-2">Users</h1>
        <p className="text-ink">
          {total} total · {active} active · {hidden} hidden
        </p>
      </div>

      <UsersAdmin users={users} selfId={user!.id} />
    </div>
  );
}
