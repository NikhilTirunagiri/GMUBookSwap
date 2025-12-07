/**
 * Loading skeleton components for better UX during data fetching
 */

export function BookCardSkeleton() {
  return (
    <div className="h-full flex flex-col rounded-xl border border-yellow-400/30 bg-gradient-to-br from-emerald-950/80 via-emerald-900/60 to-black/90 p-5 animate-pulse">
      {/* Image skeleton */}
      <div className="mb-4 flex-shrink-0">
        <div className="w-full h-64 bg-yellow-500/10 rounded-xl border border-yellow-500/30" />
      </div>

      {/* Content skeleton */}
      <div className="flex flex-col flex-grow space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-6 w-16 bg-yellow-500/20 rounded-full" />
          <div className="h-6 w-20 bg-yellow-400/20 rounded" />
        </div>

        <div className="h-5 w-3/4 bg-yellow-50/10 rounded" />
        <div className="h-4 w-1/2 bg-yellow-200/10 rounded" />

        <div className="flex items-center gap-2 pt-2 border-t border-yellow-400/20">
          <div className="h-5 w-16 bg-yellow-500/10 rounded" />
          <div className="h-4 w-24 bg-yellow-300/10 rounded" />
        </div>

        {/* Action buttons skeleton */}
        <div className="flex gap-2 pt-2 mt-auto">
          <div className="flex-1 h-10 bg-white/10 rounded-lg" />
          <div className="flex-1 h-10 bg-yellow-500/20 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function BookListingSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="h-full">
          <BookCardSkeleton />
        </li>
      ))}
    </ul>
  );
}

export function BookDetailSkeleton() {
  return (
    <div className="flex items-center gap-8 bg-emerald-900/40 border border-yellow-600/40 rounded-2xl shadow-xl p-6 animate-pulse">
      {/* Image skeleton */}
      <div className="w-48 h-72 bg-yellow-500/10 rounded-xl shadow-md border border-yellow-500/30 flex-shrink-0" />

      {/* Content skeleton */}
      <div className="flex flex-col flex-1 space-y-4">
        <div className="h-8 w-3/4 bg-yellow-300/20 rounded" />
        <div className="h-4 w-1/2 bg-yellow-200/20 rounded" />
        <div className="h-4 w-1/2 bg-yellow-200/20 rounded" />
        <div className="h-4 w-1/3 bg-yellow-200/20 rounded" />
        <div className="h-4 w-1/4 bg-yellow-400/20 rounded" />
        <div className="space-y-2">
          <div className="h-3 w-full bg-yellow-100/10 rounded" />
          <div className="h-3 w-full bg-yellow-100/10 rounded" />
          <div className="h-3 w-2/3 bg-yellow-100/10 rounded" />
        </div>
        <div className="flex gap-3 pt-2">
          <div className="h-10 w-32 bg-yellow-500/10 rounded-full" />
          <div className="h-10 w-32 bg-yellow-400/20 rounded-full" />
        </div>
      </div>
    </div>
  );
}
