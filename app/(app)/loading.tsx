// Streamed instantly while the (app) page server-renders.
// Nav chrome is rendered by the layout (stays visible during nav);
// this fills the main content area with a subtle skeleton.

import { Section } from "@/components/ui";

export default function Loading() {
  return (
    <Section className="animate-pulse">
      <div className="mb-12 pb-8 border-b border-line">
        <div className="h-3 w-32 bg-line/70 rounded-full mb-4" />
        <div className="h-12 w-2/3 bg-line/70 rounded-lg mb-3" />
        <div className="h-4 w-1/2 bg-line/50 rounded-full" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 mb-10">
        <div className="bg-white rounded-3xl shadow-xs p-5 h-28" />
        <div className="bg-white rounded-3xl shadow-xs p-5 h-28" />
        <div className="bg-white rounded-3xl shadow-xs p-5 h-28" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-white rounded-3xl shadow-xs p-6 h-40" />
        <div className="bg-white rounded-3xl shadow-xs p-6 h-40" />
      </div>
    </Section>
  );
}
