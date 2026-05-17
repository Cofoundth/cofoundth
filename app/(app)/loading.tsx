// Streamed instantly while the (app) page server-renders.
// Header is rendered by the layout (stays visible during nav);
// this fills the main content area with a subtle skeleton.

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12 animate-pulse">
      <div className="mb-12 pb-8 border-b border-line">
        <div className="h-3 w-32 bg-line/70 mb-4" />
        <div className="h-12 w-2/3 bg-line/70 mb-3" />
        <div className="h-4 w-1/2 bg-line/50" />
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        <div className="bg-white border border-line p-5 h-28" />
        <div className="bg-white border border-line p-5 h-28" />
        <div className="bg-white border border-line p-5 h-28" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white border border-line p-6 h-40" />
        <div className="bg-white border border-line p-6 h-40" />
      </div>
    </div>
  );
}
