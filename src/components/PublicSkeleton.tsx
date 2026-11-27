/** Shown to visitors while content.json loads, so the page never flashes empty or jumps. */
export function PublicSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-24">
      <span className="sr-only">Loading the portfolio…</span>
      <div className="grid lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 space-y-5" aria-hidden="true">
          <div className="skeleton h-8 w-80 max-w-full rounded-full" />
          <div className="skeleton h-14 sm:h-20 w-full max-w-xl rounded-xl" />
          <div className="skeleton h-5 w-2/3 rounded-md" />
          <div className="flex gap-3 pt-2">
            <div className="skeleton h-12 w-40 rounded-xl" />
            <div className="skeleton h-12 w-28 rounded-xl" />
          </div>
        </div>
        <div className="lg:col-span-5 flex justify-center" aria-hidden="true">
          <div className="skeleton w-full max-w-md h-72 sm:h-96 lg:h-[28.75rem] rounded-2xl" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-20" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-[#E2E8F0] p-6 space-y-4 bg-white">
            <div className="flex items-center gap-3">
              <div className="skeleton w-12 h-12 rounded-xl" />
              <div className="skeleton h-4 w-24 rounded-md" />
            </div>
            <div className="skeleton h-6 w-3/4 rounded-md" />
            <div className="skeleton h-20 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
