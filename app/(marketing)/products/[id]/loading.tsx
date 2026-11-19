// Suspense fallback for /products/<id>, a product's page. Without its own
// file this segment would inherit ../loading.tsx — the DECK's skeleton — and,
// above that, app/(marketing)/loading.tsx, the landing hero.
//
// It mirrors the product page (../ProductDetail.tsx, "THE FORMAT"): the back
// link, the product card with its title, maker and "Try it" button, then About
// above the Screenshots card (four cells, the fewest a product has: two a row
// on a phone, three from `sm`). The container is the page's own: Section's
// 1120px with app rhythm and `pb-28`. Change them together.
//
// Purely decorative: aria-hidden keeps screen readers on the route
// announcement. No copy, so nothing to translate — and a `loading.tsx` must
// render synchronously, which rules out `tServer`.
import { Card, Section } from "@/components/ui";

const BAR = "bg-line/50";

export default function Loading() {
  return (
    <Section className="pb-28 animate-pulse motion-reduce:animate-none">
      <div aria-hidden="true">
        {/* The back link: 28px tall, then its 20px margin. */}
        <div className={`mb-5 h-7 w-32 rounded-full ${BAR}`} />
        <div className="grid gap-4">
          <Card padding="responsive">
            <div className="mb-3 h-6 w-14 rounded-full bg-line/70" />
            {/* text-d2 is 33px at a 1.3 line: a 43px title line. */}
            <div className="mb-2 h-[43px] w-2/3 bg-line/70" />
            {/* The maker line: the 36px avatar and its name. */}
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-line/70" />
              <div className={`h-4 w-48 ${BAR}`} />
            </div>
            <div className={`mt-3 h-5 w-56 max-w-full ${BAR}`} />
            <div className="mt-6 h-[52px] w-full rounded-full bg-line/70" />
            <div className={`mx-auto mt-2 h-5 w-32 ${BAR}`} />
            <div className="mt-6 flex items-center justify-between border-t border-line pt-5">
              <div className={`h-6 w-24 ${BAR}`} />
              <div className={`h-6 w-16 ${BAR}`} />
            </div>
          </Card>
          <Card padding="responsive">
            <div className="mb-5 h-6 w-40 bg-line/70" />
            <div className="flex flex-col gap-2">
              <div className={`h-4 w-full ${BAR}`} />
              <div className={`h-4 w-3/4 ${BAR}`} />
            </div>
          </Card>
          <Card padding="responsive">
            <div className="mb-5 h-6 w-32 bg-line/70" />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="aspect-video rounded-xl bg-line/50" />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </Section>
  );
}
