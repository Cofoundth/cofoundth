import type { Metadata } from "next";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { terms } from "@/content/legal/terms";
import { LegalDocumentView } from "@/components/legal/LegalDocument";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  // Bare title on purpose: app/layout.tsx sets the template "%s · Cofoundee",
  // so the "— Cofoundee" these pages used to carry rendered twice
  // ("Privacy Policy — Cofoundee · Cofoundee"). Matches founders/page.tsx.
  return { title: terms[locale].title };
}

export default async function TermsPage() {
  const locale = await getLocale();
  return (
    <LegalDocumentView
      doc={terms[locale]}
      backLabel={t("Back to home", locale)}
      // 14 numbered sections; the contents list is how anyone finds §11.
      contentsLabel={t("On this page", locale)}
    />
  );
}
