// Suspense fallback for /p/<id>, a community post's or a milestone's public
// permalink. It exists for the reason ../../products/loading.tsx does: a route
// group's loading.tsx wraps every nested segment that lacks its own, so
// without this file the page would inherit app/(marketing)/loading.tsx — the
// LANDING HERO skeleton.
//
// It mirrors the post card in ./page.tsx: the narrow column with the
// marketing rhythm and `pb-28`, then one card — the author row, a title line
// and three lines of text. A product link that still points here redirects to
// /products/<id>, which has its own product-shaped skeleton.
//
// Purely decorative: aria-hidden keeps screen readers on the route
// announcement. No copy, so nothing to translate.
import { Card, Section } from "@/components/ui";

const BAR = "bg-line/50";

export default function Loading() {
  return (
    <Section
      width="narrow"
      rhythm="marketing"
      className="pb-28 animate-pulse motion-reduce:animate-none"
    >
      <Card aria-hidden="true" padding="lg">
        <div className="mb-5 flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-full bg-line/70" />
          <div className="flex flex-col gap-2">
            <div className={`h-4 w-32 ${BAR}`} />
            <div className={`h-3 w-20 ${BAR}`} />
          </div>
        </div>
        <div className="mb-4 h-[43px] w-2/3 bg-line/70" />
        <div className="flex flex-col gap-2">
          <div className={`h-4 w-full ${BAR}`} />
          <div className={`h-4 w-full ${BAR}`} />
          <div className={`h-4 w-3/4 ${BAR}`} />
        </div>
      </Card>
    </Section>
  );
}
