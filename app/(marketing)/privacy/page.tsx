import type { Metadata } from "next";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { privacy } from "@/content/legal/privacy";
import { LegalDocumentView } from "@/components/legal/LegalDocument";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  // Bare title on purpose: app/layout.tsx sets the template "%s · Cofoundee",
  // so the "— Cofoundee" these pages used to carry rendered twice
  // ("Privacy Policy — Cofoundee · Cofoundee"). Matches founders/page.tsx.
  return { title: privacy[locale].title };
}

export default async function PrivacyPage() {
  const locale = await getLocale();
  return (
    <LegalDocumentView
      doc={privacy[locale]}
      backLabel={t("Back to home", locale)}
      // ~2,800px of document; a reader after one clause gets a way in.
      contentsLabel={t("On this page", locale)}
    />
  );
}
