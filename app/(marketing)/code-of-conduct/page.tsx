import type { Metadata } from "next";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { codeOfConduct } from "@/content/legal/code-of-conduct";
import { LegalDocumentView } from "@/components/legal/LegalDocument";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  // Bare title on purpose: app/layout.tsx sets the template "%s · Cofoundee",
  // so the "— Cofoundee" these pages used to carry rendered twice
  // ("Privacy Policy — Cofoundee · Cofoundee"). Matches founders/page.tsx.
  return { title: codeOfConduct[locale].title };
}

export default async function CodeOfConductPage() {
  const locale = await getLocale();
  return (
    <LegalDocumentView
      doc={codeOfConduct[locale]}
      backLabel={t("Back to home", locale)}
      // Seven sections, but not a short document. Measured signed out at
      // 390x844 in Thai — the default locale, the common device — the page
      // without this list runs 3,944px, i.e. 4.7 phone screens and only ~8%
      // under Privacy's 4,290px measured the same way. The "too short to
      // index" call this page used to make was taken on EN desktop, where it
      // still measures 2,868px — past the ~2,800px the other two cite as
      // their own reason to take a list. This is the page people arrive at to
      // look one rule up, so it gets the same way in as its two siblings.
      contentsLabel={t("On this page", locale)}
    />
  );
}
