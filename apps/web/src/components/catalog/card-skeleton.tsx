/** Placeholder with the same shape as a card, so the layout does not jump when data arrives. */
export function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border bg-card" aria-hidden>
      <div className="skeleton-shimmer aspect-[16/10] bg-muted" />
      <div className="space-y-3 p-5">
        <div className="skeleton-shimmer h-5 w-3/4 rounded-full bg-muted" />
        <div className="flex gap-2">
          <div className="skeleton-shimmer h-6 w-20 rounded-full bg-muted" />
          <div className="skeleton-shimmer h-6 w-16 rounded-full bg-muted" />
        </div>
        <div className="skeleton-shimmer h-4 w-1/2 rounded-full bg-muted" />
        <div className="skeleton-shimmer h-1.5 w-full rounded-full bg-muted" />
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
      role="status"
      aria-label="Завантаження"
    >
      {Array.from({ length: count }, (_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}
