import { Card } from "@/components/ui";

const BAR = "animate-pulse bg-line/50 motion-reduce:animate-none";

export function ProductDetailsSkeleton({
  name,
  description,
  screenshotCount = 4,
  ratingControlHeight = 0,
}: {
  name?: string;
  description?: string;
  screenshotCount?: number;
  ratingControlHeight?: number;
}) {
  return (
    <div aria-hidden="true" className="grid gap-4">
      <Card padding="responsive">
        <div className={`mb-3 h-5 w-14 rounded-full ${BAR}`} />
        <div className="text-d2 mb-2">
          {name || <div className={`h-[1lh] w-2/3 ${BAR}`} />}
        </div>
        <div className="flex items-center gap-3">
          <div className={`size-9 shrink-0 rounded-full ${BAR}`} />
          <div className={`h-4 w-48 ${BAR}`} />
        </div>
        <div className={`mt-3 h-5 w-56 max-w-full ${BAR}`} />
        {ratingControlHeight > 0 && (
          <div className={`mt-3 w-36 ${BAR}`} style={{ height: ratingControlHeight }} />
        )}
        <div className={`mt-6 h-[52px] rounded-full ${BAR}`} />
        <div className={`mx-auto mt-2 h-5 w-32 ${BAR}`} />
        <div className="mt-6 flex items-center justify-between border-t border-line pt-5">
          <div className={`h-6 w-24 ${BAR}`} />
          <div className={`h-6 w-16 ${BAR}`} />
        </div>
      </Card>

      {description?.trim() !== "" && (
        <Card padding="responsive">
          <div className={`mb-5 h-7 w-40 ${BAR}`} />
          {description === undefined ? (
            <div className="flex flex-col gap-2">
              <div className={`h-4 w-full ${BAR}`} />
              <div className={`h-4 w-3/4 ${BAR}`} />
            </div>
          ) : (
            <p className="text-base leading-relaxed whitespace-pre-wrap text-ink">
              {description}
            </p>
          )}
        </Card>
      )}

      {screenshotCount > 0 && (
        <Card padding="responsive">
          <div className={`mb-5 h-7 w-32 ${BAR}`} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Array.from({ length: screenshotCount }, (_, i) => (
              <div key={i} className={`aspect-video rounded-xl ${BAR}`} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
