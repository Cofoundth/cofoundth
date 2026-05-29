import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n-server";
import { CompaniesClient, type CompanyProfile } from "./CompaniesClient";

export const dynamic = "force-dynamic";

const COMPANY_COLUMNS =
  "id, slug, full_name, company_name, photo_url, verified, location, i_am, intent, industry, stage, pitch, capabilities, partnership_seeking, status_tags, created_at";

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  const { focus } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const locale = await getLocale();

  // All onboarded companies (excluding self for the "send request" affordance)
  const { data: companies } = await supabase
    .from("profiles")
    .select(COMPANY_COLUMNS)
    .eq("type", "company")
    .eq("onboarded", true)
    .order("created_at", { ascending: false });

  // Current user's profile — used to scope "send partnership request"
  // (only company → company)
  const { data: me } = await supabase
    .from("profiles")
    .select(
      "id, type, company_name, capabilities, partnership_seeking, onboarded",
    )
    .eq("id", user!.id)
    .single();

  const items: CompanyProfile[] = (companies ?? [])
    .filter((c) => c.id !== user!.id)
    .map((c) => ({
      id: c.id as string,
      slug: (c.slug as string) ?? (c.id as string),
      company_name:
        (c.company_name as string | null) ?? (c.full_name as string),
      representative: c.full_name as string,
      photo_url: (c.photo_url as string | null) ?? null,
      verified: (c.verified as boolean | null) ?? false,
      location: (c.location as string | null) ?? null,
      industry: ((c.industry ?? []) as string[]) ?? [],
      stage: (c.stage as string | null) ?? null,
      pitch: (c.pitch as string | null) ?? null,
      capabilities: ((c.capabilities ?? []) as string[]) ?? [],
      partnership_seeking: ((c.partnership_seeking ?? []) as string[]) ?? [],
      status_tags: ((c.status_tags ?? []) as string[]) ?? [],
      created_at: c.created_at as string,
    }));

  // Capability + seeking tag clouds — show ALL tags in use across the
  // directory so users can discover what's available to filter by.
  const allCapabilities = new Set<string>();
  const allSeeking = new Set<string>();
  items.forEach((c) => {
    c.capabilities.forEach((t) => allCapabilities.add(t));
    c.partnership_seeking.forEach((t) => allSeeking.add(t));
  });

  return (
    <CompaniesClient
      companies={items}
      capabilities={[...allCapabilities].sort()}
      seeking={[...allSeeking].sort()}
      locale={locale}
      currentUserIsCompany={
        me?.type === "company" && me?.onboarded === true
      }
      currentUserCompanyName={
        (me?.company_name as string | null) ?? null
      }
      focusId={focus ?? null}
    />
  );
}
