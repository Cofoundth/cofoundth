// Suspense fallback for /products/<id>, a product's page. Without its own
// file this segment would inherit ../loading.tsx — the DECK's skeleton — and,
// above that, app/(marketing)/loading.tsx, the landing hero.
//
// It mirrors the product page (../ProductDetail.tsx): the back link, then the
// card — the 3:2 image box above the words on a phone, beside them from `lg`
// — with the category chip, the title, two lines of description and the
// "Try it" button. The container is the page's own: Section's 1120px with app
// rhythm and `pb-28`, the card on the 640px column until `lg`. Change them
// together.
//
// Purely decorative: aria-hidden keeps screen readers on the route
// announcement. No copy, so nothing to translate — and a `loading.tsx` must
// render synchronously, which rules out `tServer`.
import { Card, Section } from "@/components/ui";

const BAR = "bg-line/50";

export default function Loading() {
  return (
    <Section className="pb-28 animate-pulse motion-reduce:animate-none">
      <div aria-hidden="true" className="mx-auto max-w-[640px] lg:max-w-none">
        {/* The back link: 28px tall, then its 20px margin. */}
        <div className={`mb-5 h-7 w-32 rounded-full ${BAR}`} />
        <Card
          padding="none"
          className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
        >
          <div className="aspect-[3/2] w-full rounded-t-3xl bg-line/50 lg:rounded-tr-none lg:rounded-bl-3xl" />
          <div className="p-6 lg:p-8">
            <div className="mb-3 h-5 w-14 rounded-full bg-line/70" />
            {/* text-d2 is 33px at a 1.3 line: a 43px title line. */}
            <div className="mb-2 h-[43px] w-2/3 bg-line/70" />
            <div className="flex flex-col gap-2 pt-1">
              <div className={`h-4 w-full ${BAR}`} />
              <div className={`h-4 w-3/4 ${BAR}`} />
            </div>
            {/* "Try it": the md button is 44px; full width on a phone. */}
            <div className="mt-6 h-11 w-full rounded-full bg-line/70 sm:w-32" />
            <div className="mt-6 h-8 w-40 rounded-full bg-line/50" />
          </div>
        </Card>
      </div>
    </Section>
  );
}
