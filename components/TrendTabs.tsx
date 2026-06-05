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
      <div className="flex items-center gap-1 mb-4 border-b border-line">
        {series.map((s, i) => (
          <button
            key={s.name}
            type="button"
            onClick={() => setActive(i)}
            className={`px-4 py-2 text-sm tracking-wide border-b-2 -mb-px transition-colors ${
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
