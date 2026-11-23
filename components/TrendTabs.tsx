"use client";

import { useState } from "react";
import { TrendChart, type TrendSeries } from "@/components/TrendChart";

// One chart box, tab between metrics — easier to read than overlapping lines.
export function TrendTabs({
  dates,
  series,
}: {
  dates: string[];
  series: TrendSeries[];
}) {
  const [active, setActive] = useState(0);
  const current = series[active] ?? series[0];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-1 border-b border-line">
        {series.map((s, i) => (
          <button
            key={s.name}
            type="button"
            onClick={() => setActive(i)}
            aria-pressed={i === active}
            className={`-mb-px min-h-11 rounded-none border-b-2 px-3 py-2 text-sm tracking-wide transition-colors sm:px-4 ${
              i === active
                ? "border-navy text-navy font-medium"
                : "border-transparent text-ink-muted hover:text-navy"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>
      <TrendChart dates={dates} series={[current]} showLegend={false} />
    </div>
  );
}
