"use client";

import dynamic from "next/dynamic";

// ECharts is client-only + heavy, so load it lazily (no SSR) — it only ships on
// the admin overview route.
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

export type TrendSeries = { name: string; data: number[]; color: string };

export function TrendChart({
  dates,
  series,
  showLegend = true,
}: {
  dates: string[];
  series: TrendSeries[];
  showLegend?: boolean;
}) {
  const option = {
    color: series.map((s) => s.color),
    tooltip: { trigger: "axis" },
    legend: showLegend
      ? {
          data: series.map((s) => s.name),
          bottom: 0,
          icon: "roundRect",
          textStyle: { color: "#4A4A4A", fontSize: 11 },
        }
      : { show: false },
    grid: { left: 30, right: 14, top: 14, bottom: showLegend ? 40 : 24 },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: dates,
      axisLabel: { color: "#888", fontSize: 10 },
      axisLine: { lineStyle: { color: "#E2E8F0" } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      axisLabel: { color: "#888", fontSize: 10 },
      splitLine: { lineStyle: { color: "#EFEFEA" } },
    },
    series: series.map((s) => ({
      name: s.name,
      type: "line",
      smooth: true,
      symbol: "circle",
      symbolSize: 5,
      data: s.data,
      lineStyle: { width: 2 },
      areaStyle: { opacity: 0.05 },
    })),
  };

  return (
    <ReactECharts
      option={option}
      notMerge
      style={{ height: 300, width: "100%" }}
    />
  );
}
