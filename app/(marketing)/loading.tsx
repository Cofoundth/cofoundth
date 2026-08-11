// Suspense fallback for the marketing shell. It mirrors the hero in
// app/(marketing)/page.tsx block-for-block — same cream section + bottom rule,
// same max-w-7xl / px-6 lg:px-10 / py-20 lg:py-28 frame, same 12-column split
// (7 = eyebrow + wordmark + headline + paragraph + two CTAs, 5 = founders card
// with its offset gold outline). The old three-bar skeleton bore no relation to
// the real layout, so the page visibly jumped as it hydrated.
//
// Purely decorative: aria-hidden keeps screen readers on the route announcement
// rather than reading a wall of empty boxes. No copy, so nothing to translate —
// and a `loading.tsx` must render synchronously, which rules out `tServer`.
export default function Loading() {
  return (
    <section
      aria-hidden="true"
      className="bg-cream border-b border-line animate-pulse motion-reduce:animate-none"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-20 lg:py-28">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          {/* Left column */}
          <div className="lg:col-span-7">
            {/* eyebrow: live dot + "Thailand's startup community" + counts */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-line" />
              <div className="h-3 w-56 bg-line/70" />
            </div>
            {/* wordmark */}
            <div className="h-8 lg:h-10 w-48 bg-line/70 mb-5" />
            {/* headline — two lines */}
            <div className="space-y-3 mb-6">
              <div className="h-10 lg:h-14 w-full max-w-2xl bg-line/70" />
              <div className="h-10 lg:h-14 w-3/4 max-w-xl bg-line/70" />
            </div>
            {/* paragraph — three lines */}
            <div className="max-w-2xl space-y-2.5 mb-10">
              <div className="h-4 w-full bg-line/50" />
              <div className="h-4 w-full bg-line/50" />
              <div className="h-4 w-2/3 bg-line/50" />
            </div>
            {/* two CTA blocks — px-8 py-4 text-sm ≈ 52px tall */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="h-[52px] w-full sm:w-56 bg-line/70" />
              <div className="h-[52px] w-full sm:w-56 border border-line" />
            </div>
            {/* the two "Free to join" / "Built for Thailand" ticks */}
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
              <div className="h-4 w-28 bg-line/50" />
              <div className="h-4 w-36 bg-line/50" />
            </div>
          </div>

          {/* Right column — founders card */}
          <div className="lg:col-span-5">
            <div className="relative">
              <div className="bg-white border border-line p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-3 w-40 bg-line/70" />
                  <div className="h-3 w-14 bg-line/50" />
                </div>
                <div className="divide-y divide-line">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-start gap-3 py-3">
                      <div className="w-9 h-9 rounded-full bg-line/70 shrink-0" />
                      <div className="flex-1 min-w-0 space-y-2 pt-1">
                        <div className="h-3.5 w-1/2 bg-line/70" />
                        <div className="h-3 w-3/4 bg-line/50" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-line">
                  <div className="h-3 w-44 bg-line/50" />
                </div>
              </div>
              <div
                className="absolute -bottom-3 -right-3 w-full h-full border border-gold"
                style={{ zIndex: -1 }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
