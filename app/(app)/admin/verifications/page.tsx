import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { Avatar } from "@/components/Avatar";
import { VerifyToggle } from "./VerifyToggle";

export const dynamic = "force-dynamic";

export default async function AdminVerificationsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!isAdminEmail(data.user?.email)) notFound();

  // Service-role read to bypass RLS, list all profiles
  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select(
      "id, slug, full_name, company_name, photo_url, type, verified, onboarded, email, linkedin_url, created_at",
    )
    .eq("onboarded", true)
    .order("verified", { ascending: true }) // unverified first
    .order("created_at", { ascending: false });

  const companies =
    profiles?.filter((p) => p.type === "company") ?? [];
  const individuals =
    profiles?.filter((p) => p.type !== "company") ?? [];

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-10 py-10">
      <div className="mb-10 pb-8 border-b border-line">
        <div className="text-xs uppercase tracking-[0.25em] text-gold mb-3">
          Admin
        </div>
        <h1 className="text-4xl mb-2">Verifications</h1>
        <p className="text-ink leading-relaxed max-w-2xl">
          Verify profiles after manual checks (Thai company registration via{" "}
          <a
            href="https://datawarehouse.dbd.go.th/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-navy hover:text-gold underline underline-offset-4 decoration-gold/30"
          >
            DBD lookup
          </a>{" "}
          for companies, LinkedIn cross-check for individuals). Verified
          profiles show a gold checkmark across the platform.
        </p>
      </div>

      <Section
        title="Companies"
        icon={Building2}
        profiles={companies}
        emptyMessage="No company profiles yet."
      />

      <div className="mt-10">
        <Section
          title="Individuals"
          icon={BadgeCheck}
          profiles={individuals}
          emptyMessage="No individual profiles yet."
        />
      </div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  profiles,
  emptyMessage,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  profiles: Array<{ [k: string]: unknown }>;
  emptyMessage: string;
}) {
  const verifiedCount = profiles.filter((p) => p.verified).length;
  return (
    <section>
      <div className="flex items-center gap-3 mb-5">
        <Icon className="w-5 h-5 text-gold" strokeWidth={1.5} />
        <h2 className="text-2xl">{title}</h2>
        <span className="text-sm text-ink-muted ml-auto">
          {verifiedCount} / {profiles.length} verified
        </span>
      </div>

      {profiles.length === 0 ? (
        <div className="bg-white border border-line p-8 text-center text-sm text-ink-muted">
          {emptyMessage}
        </div>
      ) : (
        <div className="bg-white border border-line divide-y divide-line">
          {profiles.map((p) => (
            <div
              key={p.id as string}
              className="p-4 flex items-center gap-4"
            >
              <Avatar
                name={
                  (p.company_name as string) ?? (p.full_name as string)
                }
                url={(p.photo_url as string | null) ?? null}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/profile/${(p.slug as string) ?? p.id}`}
                    className="text-navy font-medium hover:text-gold"
                  >
                    {(p.company_name as string) ?? (p.full_name as string)}
                  </Link>
                  {!!p.verified && (
                    <BadgeCheck
                      className="w-4 h-4 text-gold"
                      strokeWidth={2}
                    />
                  )}
                </div>
                <div className="text-xs text-ink-muted truncate flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                  {!!p.company_name && (
                    <span>Rep: {p.full_name as string}</span>
                  )}
                  {!!p.email && <span>{p.email as string}</span>}
                  {!!p.linkedin_url && (
                    <a
                      href={p.linkedin_url as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-navy hover:text-gold"
                    >
                      LinkedIn ↗
                    </a>
                  )}
                  <span>
                    {new Date(p.created_at as string).toLocaleDateString(
                      "en-GB",
                      { day: "numeric", month: "short", year: "numeric" },
                    )}
                  </span>
                </div>
              </div>
              <VerifyToggle
                profileId={p.id as string}
                verified={!!p.verified}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
